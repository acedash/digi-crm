import axios from 'axios';
import { useAuthStore } from '../features/auth/useAuthStore';
export const BACKEND_BASE_URL = import.meta.env.DEV
    ? 'http://127.0.0.1:8001'
    : 'https://crm.thedigicircle.com';
export const API_BASE_URL = `${BACKEND_BASE_URL}/api`;

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    },
});

const originalGet = api.get;
const getCache = new Map();

api.hasCached = (url, config = {}) => {
    const cacheKey = JSON.stringify({ url, params: config.params || {} });
    if (getCache.has(cacheKey)) {
        const cached = getCache.get(cacheKey);
        const ttl = 30000; // 30 seconds
        if (Date.now() - cached.timestamp < ttl) {
            return true;
        } else {
            getCache.delete(cacheKey);
        }
    }
    return false;
};

api.get = function (url, config = {}) {
    const { bypassCache, ...axiosConfig } = config;
    
    if (bypassCache) {
        return originalGet.call(api, url, axiosConfig);
    }
    
    const cacheKey = JSON.stringify({ url, params: axiosConfig.params || {} });
    
    if (getCache.has(cacheKey)) {
        const cached = getCache.get(cacheKey);
        const ttl = 30000; // 30 seconds
        if (Date.now() - cached.timestamp < ttl) {
            return Promise.resolve(cached.response);
        } else {
            getCache.delete(cacheKey);
        }
    }
    
    return originalGet.call(api, url, axiosConfig).then((response) => {
        getCache.set(cacheKey, {
            response,
            timestamp: Date.now(),
        });
        return response;
    });
};

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => {
        const method = response.config?.method?.toLowerCase();
        if (['post', 'put', 'patch', 'delete'].includes(method)) {
            getCache.clear();
        }
        return response;
    },
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
