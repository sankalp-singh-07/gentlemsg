import api from './client';
import type { AuthUser } from '@/shared/types/api';

export const setToken = (token: string): void => {
	localStorage.setItem('auth-token', token);
};

export const getToken = (): string | null => {
	return localStorage.getItem('auth-token');
};

export const clearToken = (): void => {
	localStorage.removeItem('auth-token');
};

export const getMe = async (): Promise<AuthUser> => {
	const response = await api.get<AuthUser>('/auth/me');
	return response.data;
};

export const refreshToken = async (): Promise<string> => {
	const response = await api.post<{ access_token: string }>('/auth/refresh');
	const { access_token } = response.data;
	setToken(access_token);
	return access_token;
};

export const logout = async (): Promise<void> => {
	try {
		await api.post('/auth/logout');
	} catch (error) {
		console.error('Logout API error:', error);
	} finally {
		clearToken();
	}
};
