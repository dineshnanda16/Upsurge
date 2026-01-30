#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ================= CONFIG =================
const char* ssid     = "MDS1";
const char* password = "welcomehome";

// Flask server
const char* lightStateURL = "http://10.157.167.217:5000/light/state";//http://10.157.167.217:5000

// Relay pin
#define RELAY_PIN 5   // Change to your relay GPIO

// Poll interval
const unsigned long POLL_INTERVAL_MS = 2000;

// ================= GLOBALS =================
unsigned long lastPollMs = 0;

void setup() {
  Serial.begin(115200);

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);  // default OFF

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  unsigned long now = millis();

  if (now - lastPollMs >= POLL_INTERVAL_MS) {
    pollLightState();
    lastPollMs = now;
  }
}

void pollLightState() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, skipping light poll");
    return;
  }

  HTTPClient http;
  http.setTimeout(3000);  // 3 sec timeout
  http.begin(lightStateURL);

  int code = http.GET();
  if (code != 200) {
    Serial.print("Light state GET failed, code: ");
    Serial.println(code);
    http.end();
    return;
  }

  String payload = http.getString();
  http.end();

  Serial.println("Light state payload: " + payload);

  // -------- Parse JSON safely --------
  StaticJsonDocument<128> doc;
  DeserializationError err = deserializeJson(doc, payload);
  if (err) {
    Serial.print("JSON parse error: ");
    Serial.println(err.c_str());
    return;
  }

  const char* state = doc["light_state"];

  if (!state) {
    Serial.println("Invalid JSON: no light_state");
    return;
  }

  if (strcmp(state, "ON") == 0) {
    digitalWrite(RELAY_PIN, HIGH);
    Serial.println("💡 Relay ON");
  } else if (strcmp(state, "OFF") == 0) {
    digitalWrite(RELAY_PIN, LOW);
    Serial.println("💡 Relay OFF");
  } else {
    Serial.print("Unknown light_state: ");
    Serial.println(state);
  }
}