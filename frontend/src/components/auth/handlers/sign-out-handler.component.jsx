import { logout } from '../../../services/authService';

const SignOutHandler = async () => {
	try {
		await logout(); // Calls backend + clears localStorage
		window.location.href = '/'; // Full page reload to clear state and redirect
	} catch (error) {
		console.error('Sign Out Error:', error);
	}
};

export default SignOutHandler;
