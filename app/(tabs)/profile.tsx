import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ProfileScreen() {
  const patient = {
    name: 'John Doe',
    age: 72,
    gender: 'Male',
    condition: 'Spinal Cord Injury', // ✅ Updated condition
    caregiver: 'Sarah Johnson',
    contact: '+91 98765 43210',
    address: '42, Green Meadows, Chennai, India',
  };

  return (
    <LinearGradient
      colors={['#aee6ff', '#66b3ff', '#0077cc']} // 🌤 lighter top, deeper bottom
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>👤 Patient Profile</Text>

          <View style={styles.avatarWrapper}>
            <Image
              source={{
                uri: 'https://static.vecteezy.com/system/resources/previews/048/413/021/non_2x/old-man-on-wheelchair-alone-against-transparent-background-free-png.png',
              }}
              style={styles.avatar}
              resizeMode="contain" // ✅ Ensures full image fits without cropping
            />
          </View>

          <Text style={styles.name}>{patient.name}</Text>
          <Text style={styles.condition}>{patient.condition}</Text>
        </View>

        {/* Info Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Age</Text>
            <Text style={styles.value}>{patient.age}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Gender</Text>
            <Text style={styles.value}>{patient.gender}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Condition</Text>
            <Text style={styles.value}>{patient.condition}</Text>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Caregiver Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{patient.caregiver}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Contact</Text>
            <Text style={styles.value}>{patient.contact}</Text>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Address</Text>
          <Text style={styles.address}>{patient.address}</Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  scroll: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#004080',
    marginBottom: 20,
  },
  avatarWrapper: {
    backgroundColor: '#e0f7ff',
    padding: 12,
    borderRadius: 100,
    shadowColor: '#0077cc',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  avatar: {
    width: 130, // ✅ Increased width for better image visibility
    height: 130,
  },
  name: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 15,
  },
  condition: {
    fontSize: 16,
    color: '#e0f7ff',
    marginTop: 5,
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: '#fff',
    width: '90%',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0056b3',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e6f0ff',
    paddingBottom: 5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 16,
    color: '#555',
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#0077cc',
    fontWeight: '600',
  },
  address: {
    fontSize: 15,
    color: '#333',
    marginTop: 6,
    lineHeight: 22,
  },
});
