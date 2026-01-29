import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function SensorCard({ sensor }: any) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{sensor.name}</Text>
      <Text>🌡️ Temperature: {sensor.temperature} °C</Text>
      <Text>💧 Humidity: {sensor.humidity} %</Text>
      <Text style={styles.time}>Last updated: {sensor.updatedAt}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginVertical: 8, elevation: 2 },
  name: { fontWeight: 'bold', fontSize: 16, marginBottom: 5 },
  time: { color: '#888', fontSize: 12, marginTop: 4 },
});
