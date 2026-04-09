import axios from 'axios';
import { useAuthStore } from '../features/auth/useAuthStore';

export const BACKEND_BASE_URL = 'https://lightyellow-vulture-726958.hostingersite.com/api';
export const API_BASE_URL = `${BACKEND_BASE_URL}/api`;

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    },
});

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
