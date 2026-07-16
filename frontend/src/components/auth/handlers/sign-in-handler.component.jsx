// SignInHandler handles redirection to backend Google Auth Flow
const SignInHandler = () => {
	// Redirect user to the FastAPI backend's Google login endpoint
	window.location.href = `${import.meta.env.VITE_API_URL}/api/v1/auth/google/login`;
};

export default SignInHandler;

