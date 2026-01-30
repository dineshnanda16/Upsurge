import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput
} from "react-native";

const API_BASE = "http://10.157.167.217:5000"; // replace with your system's IP

export default function DashboardScreen() {

  const [customMessage, setCustomMessage] = useState("");

  type FeedbackState = {
  type: "success" | "error";
  text: string;
} | null;

  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  {/*SENDING DATA TO SERVER - ACTUAL ONE*/}
  const sendAction = async (actionType: string) => {
  setSending(true);
  setFeedback(null);

  try {
    const res = await axios.post(`${API_BASE}/action`, {
      action: actionType,
    });

    if (res.data?.success) {
      setFeedback({ type: "success", text: "Message sent successfully!" });
    } else {
      setFeedback({ type: "error", text: "Server rejected the request" });
    }
  } catch {
    setFeedback({ type: "error", text: "Failed to reach server" });
  } finally {
    setSending(false);

      // auto-hide message after 3s
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  {/*TEMPORARY ONE - STATIC MESSAGE SENDING*/}
//   const sendAction = async (actionType: string) => {
//   setSending(true);
//   setFeedback(null);

//   try {
//     // 🔥 MOCK RESPONSE (simulate backend)
//     await new Promise(resolve => setTimeout(resolve, 1000));

//     setFeedback({
//       type: "success",
//       text: `Action "${actionType}" sent successfully`,
//     });
//   } catch {
//     setFeedback({
//       type: "error",
//       text: "Failed to send action",
//     });
//   } finally {
//     setSending(false);
//     setTimeout(() => setFeedback(null), 3000);
//   }
// };

  {/*SENDING CUSTOM DATA TO SERVER - ACTUAL ONE */}
  const sendCustomMessage = async () => {
  if (!customMessage.trim() || sending) return;

  setSending(true);
  setFeedback(null);

  try {
    const res = await axios.post(`${API_BASE}/custom-message`, {
      message: customMessage,
    });

    if (res.data?.success) {
      setFeedback({ type: "success", text: "Message sent!" });
      setCustomMessage(""); // clear input
    } else {
      setFeedback({ type: "error", text: "Server rejected message" });
    }
  } catch {
    setFeedback({ type: "error", text: "Failed to reach server" });
  } finally {
    setSending(false);
    setTimeout(() => setFeedback(null), 3000);
  }
};

  {/*TEMPORARY CUSTOM DATA SENDING - STATIC MESSAGE SENDING*/}
  // const sendCustomMessage = async () => {
  //   if (!customMessage.trim()) return;

  //   setSending(true);
  //   setFeedback(null);

  //   try {
  //     // 🔥 MOCK RESPONSE (simulate backend delay)
  //     await new Promise(resolve => setTimeout(resolve, 1000));

  //     setFeedback({
  //       type: "success",
  //       text: `Message "${customMessage}" sent successfully`,
  //     });

  //     setCustomMessage(""); // clear input
  //   } catch {
  //     setFeedback({
  //       type: "error",
  //       text: "Failed to send message",
  //     });
  //   } finally {
  //     setSending(false);
  //     setTimeout(() => setFeedback(null), 3000);
  //   }
  // };

  const [data, setData] = useState({
    temperature: null,
    humidity: null,
    fall_detected: null,
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchSensorData = async () => {
    try {
      const res = await axios.get(`${API_BASE}/data`);
      setData(res.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSensorData();
    const interval = setInterval(fetchSensorData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0056b3" />
        <Text style={{ color: "#0056b3", marginTop: 10 }}>Fetching data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🌡️ Real-Time Patient Dashboard</Text>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Temperature */}
        <View style={styles.card}>
          <Text style={styles.value}>{data?.temperature ?? "--"} °C</Text>
          <View style={styles.row}>
            <Ionicons name="thermometer" size={30} color="#ff4d4d" />
            <Text style={styles.label}>Temperature</Text>
          </View>
        </View>

        {/* Humidity */}
        <View style={styles.card}>
          <Text style={styles.value}>{data?.humidity ?? "--"} %</Text>
          <View style={styles.row}>
            <Ionicons name="water" size={30} color="#0099ff" />
            <Text style={styles.label}>Humidity</Text>
          </View>
        </View>

        {/* Fall Detection */}
        <View style={styles.centerWrapper}>
           <View style={styles.card}>
          <Text
            style={[
              styles.value,
              {
                color:
                  data?.fall_detected === "YES" ? "#ff0000" : "#00cc66",
              },
            ]}
          >
            {data?.fall_detected === "YES" ? "Fall Detected" : "No Fall"}
          </Text>
          <View style={styles.row}>
            <Ionicons
            name={
              data?.fall_detected === "YES"
                ? "alert-circle"
                : "checkmark-circle"
            }
            size={30}
            color={data?.fall_detected === "YES" ? "#ff0000" : "#00cc66"}
          />
          <Text style={styles.label}>Fall Detection Status</Text>
          </View>
          
        </View>
        </View>

        {/*PRE-DEFINED BUTTONS*/}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => sendAction("I am on my way")}
          disabled={sending}
        >
          <Ionicons name="pulse" size={20} color="#fff" />
          <Text style={styles.buttonText}>I am on my way</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => sendAction("Help is arranged")}
          disabled={sending}
        >
          <Ionicons name="analytics" size={20} color="#fff" />
          <Text style={styles.buttonText}>Help is arranged</Text>
        </TouchableOpacity>
        
        {/*IN-APP FEEDBACK NOTIFICATION*/}
        {feedback && (
          <View
            style={[
              styles.feedbackBox,
              feedback.type === "success"
                ? styles.successBox
                : styles.errorBox,
            ]}
          >
            <Text style={styles.feedbackText}>{feedback.text}</Text>
          </View>
        )}

        {/*CUSTOM BUTTONS*/}
        {/* Custom Message Input */}
        <View style={styles.inputWrapper}>
          <TextInput
            value={customMessage}
            onChangeText={setCustomMessage}
            placeholder="Type your message..."
            placeholderTextColor="#999"
            style={styles.textInput}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!customMessage.trim() || sending) && { opacity: 0.5 },
            ]}
            onPress={sendCustomMessage}
            disabled={!customMessage.trim() || sending}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Floating Chatbot Button */}
      <TouchableOpacity
        style={styles.chatButton}
        onPress={() => router.push("/chatscreen")}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={30} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f6fc", paddingTop: 50 },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0056b3",
    textAlign: "center",
    marginBottom: 20,
  },
  scrollContainer: {
  paddingHorizontal: 16,
  paddingBottom: 120,

  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between"
},
card: {
  backgroundColor: "#ffffff",
  width: "48%",          // 👈 two cards per row
  borderRadius: 16,
  paddingVertical: 20,
  paddingHorizontal: 12,
  marginBottom: 14,

  alignItems: "center",
  justifyContent: "center",

  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
  elevation: 4,
},
label: {
  fontSize: 13,
  color: "#666",
  marginTop: 4,
},
  value: {
  fontSize: 28,
  fontWeight: "700",
  color: "#0a3d91",
  marginTop: 6,
},
  chatButton: {
    position: "absolute",
    bottom: 25,
    right: 25,
    backgroundColor: "#0056b3",
    borderRadius: 40,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f2f6fc",
  },
  icon: {
    marginTop: 100
  },
  row: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8, // spacing between icon and text
},
centerWrapper:{
  width: "100%",
  alignItems: "center"
},
buttonRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 10,
  marginBottom: 30,
  width: "100%",
},

actionButton: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",

  width: "48%",
  paddingVertical: 14,
  borderRadius: 14,

  backgroundColor: "#0056b3",

  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
  elevation: 4,
},

buttonText: {
  color: "#fff",
  fontSize: 15,
  fontWeight: "600",
  marginLeft: 8,
},

feedbackBox: {
  marginTop: 12,
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderRadius: 12,
  alignItems: "center",
},

successBox: {
  backgroundColor: "#d4f7e3",
},

errorBox: {
  backgroundColor: "#fde2e2",
},

feedbackText: {
  fontSize: 14,
  fontWeight: "600",
  color: "#333",
},

inputWrapper: {
  flexDirection: "row",
  alignItems: "center",

  backgroundColor: "#fff",
  borderRadius: 16,
  paddingHorizontal: 12,
  paddingVertical: 8,

  marginTop: 16,
  width: "100%",

  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
},

textInput: {
  flex: 1,
  fontSize: 15,
  color: "#333",
  paddingVertical: 6,
},

sendButton: {
  backgroundColor: "#0056b3",
  padding: 10,
  borderRadius: 12,
  marginLeft: 8,
}


});
