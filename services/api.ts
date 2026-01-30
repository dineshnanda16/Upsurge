import axios from 'axios';

const API_BASE = 'http://192.168.1.100:5000'; // your Flask server IP

export async function getSensors() {
  try {
    const res = await axios.get(`${API_BASE}/sensors`);
    return res.data;
  } catch {
    return [];
  }
}

export async function getReminders() {
  try {
    const res = await axios.get(`${API_BASE}/reminders`);
    return res.data;
  } catch {
    return [];
  }
}
