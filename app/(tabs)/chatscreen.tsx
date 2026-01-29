import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ChatScreen() {
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(
        `http://10.75.67.97:8501/?message=${encodeURIComponent(input)}`
      );
      const data = await res.json();
      const botMsg = {
        sender: "bot",
        text: data.reply || "⚠ No response from AI model.",
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg = {
        sender: "bot",
        text: "⚠ Server not responding. Please try again later.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" />
      {/* 🌿 Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Image
          source={{
            uri: "https://cdn-icons-png.flaticon.com/512/2966/2966488.png",
          }}
          style={styles.logo}
        />
        <Text style={styles.title}>Aid4All</Text>
      </View>

      {/* 💬 Chat Area */}
      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <View
            style={[
              styles.message,
              item.sender === "user" ? styles.user : styles.bot,
            ]}
          >
            <Text
              style={[
                styles.text,
                item.sender === "user" ? styles.userText : styles.botText,
              ]}
            >
              {item.text}
            </Text>
          </View>
        )}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      {/* ⏳ Typing Indicator */}
      {loading && <TypingIndicator />}

      {/* ✏ Input Field */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask Aid4All something..."
          value={input}
          onChangeText={setInput}
          editable={!loading}
          placeholderTextColor="#aaa"
        />
        <TouchableOpacity
          style={[styles.sendBtn, loading && { opacity: 0.5 }]}
          onPress={sendMessage}
          disabled={loading}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

/* 💬 Animated Typing Indicator Component */
function TypingIndicator() {
  const dot1 = new Animated.Value(0);
  const dot2 = new Animated.Value(0);
  const dot3 = new Animated.Value(0);

  const animate = (dot: Animated.Value, delay: number) => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(dot, {
          toValue: 1,
          duration: 400,
          delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dot, {
          toValue: 0,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  useEffect(() => {
    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
  }, []);

  return (
    <View style={styles.typingContainer}>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.dot, { opacity: dot1 }]} />
        <Animated.View style={[styles.dot, { opacity: dot2 }]} />
        <Animated.View style={[styles.dot, { opacity: dot3 }]} />
      </View>
      <Text style={styles.typingText}>Aid4All is thinking...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f9ff",
  },
  header: {
    backgroundColor: "#007bff",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  backBtn: {
    color: "#fff",
    fontSize: 24,
    marginRight: 10,
  },
  logo: { width: 32, height: 32, marginRight: 10 },
  title: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "bold",
  },
  message: {
    padding: 12,
    marginVertical: 6,
    marginHorizontal: 10,
    borderRadius: 16,
    maxWidth: "80%",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  user: {
    alignSelf: "flex-end",
    backgroundColor: "#007bff",
  },
  bot: {
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
  },
  text: { fontSize: 15 },
  userText: { color: "#fff" },
  botText: { color: "#333" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderColor: "#ddd",
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 45,
    backgroundColor: "#f9f9f9",
    color: "#000",
  },
  sendBtn: {
    backgroundColor: "#007bff",
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginLeft: 8,
  },
  sendText: {
    color: "#fff",
    fontWeight: "bold",
  },
  typingContainer: {
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 10,
  },
  typingBubble: {
    flexDirection: "row",
    backgroundColor: "#e0f0ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#007bff",
    marginHorizontal: 3,
  },
  typingText: {
    color: "#555",
    fontStyle: "italic",
    fontSize: 12,
  },
});
