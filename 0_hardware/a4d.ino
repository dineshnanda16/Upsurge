/********************  AID FOR ALL — STANDALONE (NO BLYNK / NO ESP-NOW)  ********************
 * ESP32 + Keypad + LCD I2C + DHT11 + MPU6050 + JQ6500 (UART1) + GPS (UART2)
 * Twilio (SMS/Call) only. Fall detection uses axis-dominance logic and
 * sends SMS with Google Maps link (if GPS fix available).
 * Flask: Sends JSON data (Temp, Humidity, GPS, Light, Fall) every 5 seconds.
 ****************************************************************************/

#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <MPU6050.h>
#include <DHT.h>
#include <Keypad.h>
#include <HardwareSerial.h>
#include <JQ6500_Serial.h>
#include <TinyGPSPlus.h>
#include <math.h>

// ------------------- Pins & Peripherals -------------------
#define DHTPIN 4
#define DHTTYPE DHT11
#define BUZZER_PIN 15

LiquidCrystal_I2C lcd(0x27, 16, 2);
MPU6050 mpu;
DHT dht(DHTPIN, DHTTYPE);

// ---- UARTs ----
HardwareSerial mp3Serial(1);
JQ6500_Serial mp3(mp3Serial);

// GPS on UART2 (RX=34, TX=19)
HardwareSerial gpsSerial(2);
TinyGPSPlus gps;

// ------------------- Twilio Credentials -------------------
const char* account_sid = "ACd501db85c884039c31f58ae3206171de";
const char* auth_token = "8862daa33cf2271d1ee75996f14693e6";
const char* from_number = "+12272380645";
const char* to_number = "+917550270150";

// ------------------- Keypad -------------------
#define ROW_NUM 4
#define COLUMN_NUM 4
char keys[ROW_NUM][COLUMN_NUM] = {
  { '1', '4', '7', '*' },
  { '2', '5', '8', '0' },
  { '3', '6', '9', '#' },
  { 'A', 'B', 'C', 'D' }
};
byte pin_rows[ROW_NUM] = { 32, 33, 25, 26 };
byte pin_column[COLUMN_NUM] = { 27, 14, 12, 13 };
Keypad keypad = Keypad(makeKeymap(keys), pin_rows, pin_column, ROW_NUM, COLUMN_NUM);

// ------------------- FreeRTOS Task Handles -------------------
TaskHandle_t TaskKeypadHandle;
TaskHandle_t TaskMainHandle;

// ------------------- GPS cache & fall spam control -------------------
double lastLat = 0.0, lastLng = 0.0;
bool gpsFixValid = false;
unsigned long lastGpsFixMs = 0;
unsigned long lastFallMs = 0;

// cooldown between fall SMS
const unsigned long FALL_COOLDOWN_MS = 10000;

// ------------------- Fall detection tuning & buzzer timing -------------------
const unsigned long BUZZ_DURATION_MS = 2000;
bool fallBuzzerOn = false;
unsigned long fallBuzzStartMs = 0;

// NOTE: This value depends on MPU range (±2g => ~16384 LSB per g).
const int FALL_AXIS_THRESHOLD = 5000;

// ------------------- Flask + Sensors -------------------
float temperature = 0.0, humidity = 0.0;
bool lightState = false;
bool fallDetected = false;
const char* flaskServerURL = "http://10.157.167.217:5000/sensor";  // existing
// NEW: caregiver status URL (same IP as Flask)
// Caregiver status
const char* caregiverStatusUrl = "http://10.157.167.217:5000/caregiver-status";
const char* caregiverStatusConsumeUrl = "http://10.157.167.217:5000/caregiver-status/consume";

// App action
const char* actionStatusUrl = "http://10.157.167.217:5000/action";
const char* actionConsumeUrl = "http://10.157.167.217:5000/action/consume";

// App custom message
const char* customMessageUrl = "http://10.157.167.217:5000/custom-message";
const char* customMessageConsumeUrl = "http://10.157.167.217:5000/custom-message/consume";

// ------------------- Function Prototypes -------------------
void TaskKeypad(void* pv);
void TaskMain(void* pv);
void sendSMS(const String& message);
void makeCall();
void sendFallSMS();
void readGPSContinuously();
void handleFallDetection();
void sendDataToFlask();
void checkCaregiverStatus();  // NEW
String googleMapsLink(double lat, double lng);

// ------------------- Setup -------------------
void setup() {
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  Serial.begin(115200);
  delay(100);

  // LCD
  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("AID FOR ALL");
  lcd.setCursor(0, 1);
  lcd.print("Booting...");

  // WiFi via WiFiManager
  WiFi.mode(WIFI_STA);
  WiFiManager wm;
  if (!wm.autoConnect("ESP32-Setup", "12345678")) {
    Serial.println("WiFiManager failed, restarting...");
    delay(1000);
    ESP.restart();
  }
  Serial.print("WiFi OK. IP: ");
  Serial.println(WiFi.localIP());
  lcd.clear();
  lcd.print("WiFi connected");

  // DHT
  dht.begin();

  // MPU6050
  mpu.initialize();
  if (!mpu.testConnection()) {
    Serial.println("MPU6050 not connected!");
    lcd.clear();
    lcd.print("MPU missing");
  } else {
    Serial.println("MPU6050 OK");
    mpu.setClockSource(MPU6050_CLOCK_PLL_XGYRO);
    mpu.setFullScaleAccelRange(MPU6050_ACCEL_FS_2);
    mpu.setDLPFMode(3);
    mpu.setRate(4);
  }

  // MP3 (JQ6500)
  mp3Serial.begin(9600, SERIAL_8N1, 16, 17);
  mp3.reset();
  delay(500);
  mp3.setVolume(30);

  // GPS
  gpsSerial.begin(9600, SERIAL_8N1, 34, 19);
  Serial.println("GPS init OK");
  lcd.clear();
  lcd.print("Init complete");

  // Create tasks
  xTaskCreatePinnedToCore(TaskKeypad, "TaskKeypad", 10000, NULL, 1, &TaskKeypadHandle, 0);
  xTaskCreatePinnedToCore(TaskMain, "TaskMain", 12000, NULL, 1, &TaskMainHandle, 1);
}

void loop() {}

// ------------------- Task: Keypad -------------------
void TaskKeypad(void* pv) {
  (void)pv;
  for (;;) {
    char key = keypad.getKey();
    if (key) {
      lcd.clear();
      switch (key) {
        case '1':
          lcd.print("NEED WATER !");
          sendSMS("NEED WATER !");
          mp3.playFileByIndexNumber(7);
          break;
        case '2':
          lcd.print("GIVE ME TABLETS");
          sendSMS("GIVE ME TABLETS");
          mp3.playFileByIndexNumber(6);
          break;
        case '3':
          lcd.print("RESTROOM");
          sendSMS("RESTROOM");
          mp3.playFileByIndexNumber(4);
          break;
        case '4':
          lcd.print("I NEED REST");
          sendSMS("I NEED REST");
          mp3.playFileByIndexNumber(3);
          break;
        case '5':
          lcd.print("I AM HUNGRY");
          sendSMS("I AM HUNGRY");
          mp3.playFileByIndexNumber(1);
          break;
        case 'B':
          lcd.print("Ambulance");
          makeCall();
          mp3.playFileByIndexNumber(2);
          break;
        case '7':
          lcd.print("LIGHT ON");
          lightState = true;
          break;
        case '8':
          lcd.print("LIGHT OFF");
          lightState = false;
          break;
        case '9':
          lcd.print("FAN ON");
          break;
        case 'C':
          lcd.print("FAN OFF");
          break;
        case 'A':
          lcd.print("EMERGENCY");
          digitalWrite(BUZZER_PIN, HIGH);
          delay(2000);
          digitalWrite(BUZZER_PIN, LOW);
          break;
        case '6':
          lcd.print("RELAX");
          digitalWrite(BUZZER_PIN, LOW);
          fallBuzzerOn = false;
          break;
        case '*':
          lcd.print("Yes");
          mp3.playFileByIndexNumber(5);
          break;
        case 'D':
          lcd.print("No");
          mp3.playFileByIndexNumber(2);
          break;
        case '0':
          lcd.clear();
          break;
      }
    }
    vTaskDelay(100 / portTICK_PERIOD_MS);
  }
}

// ------------------- Task: Sensors & Fall -------------------
void TaskMain(void* pv) {
  (void)pv;
  unsigned long lastSend = 0;
  for (;;) {
    readGPSContinuously();
    handleFallDetection();

    unsigned long now = millis();
    if (now - lastSend >= 5000) {  // every 5 sec
      temperature = dht.readTemperature();
      humidity = dht.readHumidity();
      sendDataToFlask();
      checkCaregiverStatus();
      checkActionFromApp();
      checkCustomMessageFromApp();
      lastSend = now;
    }

    vTaskDelay(50 / portTICK_PERIOD_MS);
  }
}

// ------------------- Sensors & Logic -------------------
void readGPSContinuously() {
  while (gpsSerial.available() > 0) {
    int c = gpsSerial.read();
    if (gps.encode((char)c)) {
      if (gps.location.isValid()) {
        lastLat = gps.location.lat();
        lastLng = gps.location.lng();
        gpsFixValid = true;
        lastGpsFixMs = millis();
      }
    }
  }

  if (gpsFixValid && (millis() - lastGpsFixMs > 120000UL)) {
    gpsFixValid = false;
  }
}

void handleFallDetection() {
  int16_t ax, ay, az;
  mpu.getAcceleration(&ax, &ay, &az);
  unsigned long now = millis();

  if (fallBuzzerOn && (now - fallBuzzStartMs >= BUZZ_DURATION_MS)) {
    digitalWrite(BUZZER_PIN, LOW);
    fallBuzzerOn = false;
  }

  if (now - lastFallMs < FALL_COOLDOWN_MS) {
    if (abs(az) > abs(ax) && abs(az) > abs(ay)) {
      digitalWrite(BUZZER_PIN, LOW);
      fallDetected = false;
      fallBuzzerOn = false;
    }
    return;
  }

  if (abs(ax) > abs(ay) && abs(ax) > abs(az) && abs(ax) > FALL_AXIS_THRESHOLD) {
    fallDetected = true;
    digitalWrite(BUZZER_PIN, HIGH);
    fallBuzzerOn = true;
    fallBuzzStartMs = now;

    mp3.playFileByIndexNumber(2);
    lcd.clear();
    lcd.print("FALL DETECTED!");
    sendFallSMS();
    lastFallMs = now;
  } else if (abs(az) > abs(ax) && abs(az) > abs(ay)) {
    digitalWrite(BUZZER_PIN, LOW);
    fallDetected = false;
    fallBuzzerOn = false;
  } else if ((abs(ay) > abs(az) || abs(ay) > abs(ax)) && abs(ay) > FALL_AXIS_THRESHOLD) {
    fallDetected = true;
    digitalWrite(BUZZER_PIN, HIGH);
    fallBuzzerOn = true;
    fallBuzzStartMs = now;

    mp3.playFileByIndexNumber(2);
    lcd.clear();
    lcd.print("FALL DETECTED!");
    sendFallSMS();
    lastFallMs = now;
  }
}

// ------------------- Twilio Helpers -------------------
void sendSMS(const String& message) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected (SMS skipped)");
    return;
  }

  HTTPClient http;
  String url = "https://api.twilio.com/2010-04-01/Accounts/" + String(account_sid) + "/Messages.json";
  String data = "To=" + String(to_number) + "&From=" + String(from_number) + "&Body=" + message;
  http.setReuse(true);
  http.begin(url);
  http.setAuthorization(account_sid, auth_token);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");

  int httpResponseCode = http.POST(data);
  if (httpResponseCode > 0) {
    Serial.println("SMS sent!");
  } else {
    Serial.print("SMS POST error: ");
    Serial.println(httpResponseCode);
  }
  http.end();
}

void makeCall() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected (Call skipped)");
    return;
  }

  HTTPClient http;
  String url = "https://api.twilio.com/2010-04-01/Accounts/" + String(account_sid) + "/Calls.json";
  String data = "To=" + String(to_number) + "&From=" + String(from_number) + "&Url=http://demo.twilio.com/docs/voice.xml";

  http.begin(url);
  http.setAuthorization(account_sid, auth_token);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");

  int httpResponseCode = http.POST(data);
  if (httpResponseCode > 0) {
    Serial.println("Call initiated!");
  } else {
    Serial.print("Call POST error: ");
    Serial.println(httpResponseCode);
  }
  http.end();
}

void sendFallSMS() {
  readGPSContinuously();
  String msg = "FALL DETECTED! ";
  if (gpsFixValid) {
    msg += "Location: " + googleMapsLink(lastLat, lastLng);
  } else {
    msg += "GPS fix pending.";
  }
  msg += " Time(ms):" + String(millis());
  sendSMS(msg);
}

// ------------------- Flask Upload -------------------
void sendDataToFlask() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected (Flask skipped)");
    return;
  }

  HTTPClient http;
  http.begin(flaskServerURL);
  http.addHeader("Content-Type", "application/json");

  String payload = "{";
  payload += "\"temperature\":" + String(temperature) + ",";
  payload += "\"humidity\":" + String(humidity) + ",";
  payload += "\"gps_lat\":" + String(lastLat, 6) + ",";
  payload += "\"gps_lon\":" + String(lastLng, 6) + ",";
  payload += "\"light_state\":\"" + String(lightState ? "ON" : "OFF") + "\",";
  payload += "\"fall_detected\":\"" + String(fallDetected ? "YES" : "NO") + "\"";
  payload += "}";

  Serial.println("Sending to Flask:");
  Serial.println(payload);

  int code = http.POST(payload);
  Serial.print("Response code: ");
  Serial.println(code);

  if (code > 0) {
    String response = http.getString();
    Serial.println("Flask response: " + response);
  }

  http.end();
}

void checkCaregiverStatus() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected (caregiver status skipped)");
    return;
  }

  HTTPClient http;
  http.begin(caregiverStatusUrl);
  int code = http.GET();
  if (code == 200) {
    String resp = http.getString();
    Serial.println("Caregiver status response: " + resp);

    bool onTheWay = resp.indexOf("\"status\":\"on_the_way\"") != -1;
    bool consumed = resp.indexOf("\"consumed\":true") != -1;

    if (onTheWay && !consumed) {
      // Show only once per button press
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Caregiver");
      lcd.setCursor(0, 1);
      lcd.print("ON THE WAY  ");

      // Mark as consumed so it won't repeat
      HTTPClient http2;
      http2.begin(caregiverStatusConsumeUrl);
      http2.addHeader("Content-Type", "application/json");
      int code2 = http2.POST("{}");
      Serial.print("Consume response code: ");
      Serial.println(code2);
      http2.end();
    }
  } else {
    Serial.print("Caregiver status GET error: ");
    Serial.println(code);
  }
  http.end();
}

// ------------------- Utils -------------------
String googleMapsLink(double lat, double lng) {
  String link = "https://www.google.com/maps?q=";
  link += String(lat, 6);
  link += ",";
  link += String(lng, 6);
  return link;
}
void checkActionFromApp() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(actionStatusUrl);
  int code = http.GET();
  if (code != 200) {
    http.end();
    return;
  }

  String resp = http.getString();
  http.end();

  Serial.println("Action JSON: " + resp);

  bool hasAction = resp.indexOf("\"action\"") != -1;
  bool consumed = resp.indexOf("\"consumed\":true") != -1;

  if (hasAction && !consumed) {
    // -------- Extract action value (simple method) --------
    int i = resp.indexOf("\"action\":\"");
    if (i >= 0) {
      i += 10;
      int j = resp.indexOf("\"", i);
      String action = resp.substring(i, j);

      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print(action);

      Serial.println("📲 LCD Action: " + action);

      // Mark consumed
      HTTPClient http2;
      http2.begin(actionConsumeUrl);
      http2.addHeader("Content-Type", "application/json");
      http2.POST("{}");
      http2.end();
    }
  }
}

void checkCustomMessageFromApp() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(customMessageUrl);
  int code = http.GET();
  if (code != 200) {
    http.end();
    return;
  }

  String resp = http.getString();
  http.end();

  Serial.println("Custom Msg JSON: " + resp);

  bool hasMsg = resp.indexOf("\"message\"") != -1;
  bool consumed = resp.indexOf("\"consumed\":true") != -1;

  if (hasMsg && !consumed) {
    int i = resp.indexOf("\"message\":\"");
    if (i >= 0) {
      i += 11;
      int j = resp.indexOf("\"", i);
      String msg = resp.substring(i, j);

      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print(msg);

      Serial.println("💬 LCD Message: " + msg);

      // Mark consumed
      HTTPClient http2;
      http2.begin(customMessageConsumeUrl);
      http2.addHeader("Content-Type", "application/json");
      http2.POST("{}");
      http2.end();
    }
  }
}