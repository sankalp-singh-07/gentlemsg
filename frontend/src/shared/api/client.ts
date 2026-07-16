import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
	throw new Error('VITE_API_URL environment variable is required');
}

const api = axios.create({
	baseURL: `${API_URL}/api/v1`,
	headers: {
		'Content-Type': 'application/json',
	},
	withCredentials: true,
});

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

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async (): Promise<string> => {
	if (!refreshPromise) {
		refreshPromise = axios
			.post(
				`${API_URL}/api/v1/auth/refresh`,
				{},
				{ withCredentials: true }
			)
			.then((res) => {
				const accessToken = res.data.access_token as string;
				localStorage.setItem('auth-token', accessToken);
				return accessToken;
			})
			.finally(() => {
				refreshPromise = null;
			});
	}
	return refreshPromise;
};

api.interceptors.response.use(
	(response) => response,
	async (error: AxiosError) => {
		const originalRequest = error.config as RetryConfig | undefined;

		if (
			error.response?.status === 401 &&
			originalRequest &&
			!originalRequest._retry &&
			!originalRequest.url?.includes('/auth/refresh') &&
			!originalRequest.url?.includes('/auth/logout')
		) {
			originalRequest._retry = true;
			try {
				const accessToken = await refreshAccessToken();
				originalRequest.headers.Authorization = `Bearer ${accessToken}`;
				return api(originalRequest);
			} catch {
				localStorage.removeItem('auth-token');
				if (window.location.pathname !== '/') {
					window.location.href = '/';
				}
				return Promise.reject(error);
			}
		}

		return Promise.reject(error);
	}
);

export default api;
export { API_URL };
