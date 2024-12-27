import Cookies from 'universal-cookie';

const cookies = new Cookies();

// Set
export const setCookie = (token) => {
	cookies.set('auth-token', token, {
		path: '/',
		maxAge: 3600,
		sameSite: 'None',
		secure: true,
	});
};

// Get
export const getCookie = () => cookies.get('auth-token');

// Remove
export const removeCookie = () => cookies.remove('auth-token', { path: '/' });
