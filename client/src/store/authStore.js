import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      loading: false,

      register: async (userData) => {
        set({ loading: true });
        try {
          const response = await axios.post(`${API_URL}/auth/register`, userData);
          const { user, token } = response.data.data;
          
          set({ user, token, loading: false });
          localStorage.setItem('token', token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          toast.success('Registration successful!');
          return true;
        } catch (error) {
          set({ loading: false });
          toast.error(error.response?.data?.message || 'Registration failed');
          return false;
        }
      },

      login: async (credentials) => {
        set({ loading: true });
        try {
          const response = await axios.post(`${API_URL}/auth/login`, credentials);
          const { user, token } = response.data.data;
          
          set({ user, token, loading: false });
          localStorage.setItem('token', token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          toast.success('Login successful!');
          return true;
        } catch (error) {
          set({ loading: false });
          toast.error(error.response?.data?.message || 'Login failed');
          return false;
        }
      },

      logout: () => {
        set({ user: null, token: null });
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        toast.success('Logged out successfully');
      },

      updateUser: (userData) => {
        set({ user: userData });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);

// Set axios defaults if token exists
const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}
