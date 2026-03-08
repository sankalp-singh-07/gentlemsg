import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
    throw new Error('VITE_API_URL environment variable is required');
}

const api = axios.create({
	baseURL: `${API_URL}/api/v1`,
	headers: {
		'Content-Type': 'application/json',
	},
});

// Request interceptor — attach JWT token
api.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem('auth-token');
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => Promise.reject(error)
);

// Response interceptor — handle 401
api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			localStorage.removeItem('auth-token');
			// Only redirect if not already on login page
			if (window.location.pathname !== '/') {
				window.location.href = '/';
			}
		}
		return Promise.reject(error);
	}
);

export default api;
export { API_URL };
