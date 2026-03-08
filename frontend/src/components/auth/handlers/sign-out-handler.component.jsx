import { logout } from '../../../services/authService';

const SignOutHandler = async () => {
	try {
		await logout(); // Calls backend + clears localStorage
	} catch (error) {
		console.error('Sign Out Error:', error);
	}
};

export default SignOutHandler;
