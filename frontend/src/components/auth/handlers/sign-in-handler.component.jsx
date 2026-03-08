import { googleLogin, setToken } from '../../../services/authService';

const SignInHandler = async () => {
	try {
		// Use Google Identity Services to get ID token
		const idToken = await new Promise((resolve, reject) => {
			/* global google */
			google.accounts.id.initialize({
				client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
				callback: (response) => {
					if (response.credential) {
						resolve(response.credential);
					} else {
						reject(new Error('No credential received'));
					}
				},
			});

			// Use the One Tap prompt or fallback to button flow
			google.accounts.id.prompt((notification) => {
				if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
					// Fallback: use renderButton approach on the sign-in page
					// This is handled by the sign-in component rendering the button
					reject(new Error('Google prompt not displayed'));
				}
			});
		});

		// Send Google ID token to backend → receive JWT
		const user = await googleLogin(idToken);
		return user;
	} catch (error) {
		console.error('Error signing in with Google:', error);
		throw error;
	}
};

export default SignInHandler;

/**
 * Render the Google Sign-In button into a container element.
 * Call this from a component's useEffect to render the button.
 */
export const renderGoogleButton = (containerId, onSuccess) => {
	/* global google */
	if (typeof google === 'undefined') return;

	google.accounts.id.initialize({
		client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
		callback: async (response) => {
			if (response.credential) {
				try {
					const user = await googleLogin(response.credential);
					if (onSuccess) onSuccess(user);
				} catch (error) {
					console.error('Google login failed:', error);
				}
			}
		},
	});

	google.accounts.id.renderButton(document.getElementById(containerId), {
		theme: 'outline',
		size: 'large',
		type: 'standard',
		text: 'signin_with',
		shape: 'rectangular',
		width: 300,
	});
};
