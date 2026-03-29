import axios from 'axios';
import { useStudentStore } from '@/stores/useStudentStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

const studentApiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Attach student access token
studentApiClient.interceptors.request.use((config) => {
  const token = useStudentStore.getState().studentAccessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — redirect to student login
studentApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      useStudentStore.getState().clearStudentAuth();
      if (typeof window !== 'undefined') {
        window.location.href = '/student/login';
      }
    }
    return Promise.reject(error);
  }
);

export default studentApiClient;
