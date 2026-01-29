import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function ReminderScreen() {
  const [reminders, setReminders] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    Notifications.requestPermissionsAsync();
    startPulseAnimation();
  }, []);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  };

  async function scheduleAlarm(date) {
    try {
      const validDate = date instanceof Date ? date : new Date(date);
      if (isNaN(validDate.getTime())) throw new Error('Invalid date');

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💊 Medicine Reminder',
          body: 'It’s time to take your medicine!',
          sound: true,
          vibrate: [500, 500, 500, 500],
        },
        trigger: { type: 'date', date: validDate },
      });

      const newReminder = {
        id: notificationId,
        title: 'Tablet Reminder',
        body: 'Take your medicine on time!',
        time: validDate.toLocaleTimeString(),
        date: validDate.toLocaleString(),
      };
      setReminders((prev) => [...prev, newReminder]);
      Alert.alert('✅ Alarm Set', `Scheduled for ${validDate.toLocaleString()}`);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message);
    }
  }

  async function deleteReminder(id) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
      Alert.alert('🗑️ Deleted', 'Reminder removed successfully.');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to delete reminder');
    }
  }

  const onTimeChange = (event, selected) => {
    setShowPicker(false);
    if (selected) {
      setSelectedDate(selected);
      scheduleAlarm(selected);
    }
  };

  return (
    <LinearGradient colors={['#a1c4fd', '#c2e9fb']} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.headerBox}>
          <Text style={styles.headerTitle}>Smart Medicine Reminder</Text>
          <Text style={styles.headerSubtitle}>Stay on track — stay healthy</Text>
        </View>

        {/* Add Reminder Button with animation */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={26} color="#fff" />
            <Text style={styles.addButtonText}>Add New Reminder</Text>
          </TouchableOpacity>
        </Animated.View>

        {showPicker && (
          <DateTimePicker
            value={selectedDate}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={onTimeChange}
          />
        )}

        {/* Reminder Cards */}
        {reminders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="alarm-outline" size={50} color="#ffffffcc" />
            <Text style={styles.emptyText}>No reminders yet — add one!</Text>
          </View>
        ) : (
          reminders.map((r) => (
            <LinearGradient
              key={r.id}
              colors={['#ffffffaa', '#e8f1ff']}
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{r.title}</Text>
                  <Text style={styles.cardBody}>{r.body}</Text>
                  <Text style={styles.cardTime}>🕐 {r.time}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteReminder(r.id)}
                >
                  <Ionicons name="trash" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          ))
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    paddingTop: 40,
  },
  scrollContainer: {
    padding: 20,
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 25,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: '#00000030',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#f8f9ff',
    marginTop: 6,
  },
  addButton: {
    backgroundColor: '#4e8cff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 8,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#00000040',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    backdropFilter: 'blur(10px)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2a3d66',
  },
  cardBody: {
    fontSize: 14,
    color: '#415a77',
    marginTop: 4,
  },
  cardTime: {
    fontSize: 13,
    color: '#5a6b8c',
    marginTop: 6,
  },
  deleteButton: {
    backgroundColor: '#ff4d4d',
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: {
    color: '#f0f4ff',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
  },
});
