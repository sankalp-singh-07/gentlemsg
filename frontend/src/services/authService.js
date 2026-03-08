import api from "./api";

// Store JWT token
export const setToken = (token) => {
  localStorage.setItem("auth-token", token);
};

// Get JWT token
export const getToken = () => {
  return localStorage.getItem("auth-token");
};

// Remove JWT token
export const removeToken = () => {
  localStorage.removeItem("auth-token");
};

// Google login — send Google ID token to backend, receive JWT
export const googleLogin = async (idToken) => {
  const response = await api.post("/auth/google", { token: idToken });
  const { access_token, user } = response.data;
  setToken(access_token);
  return user;
};

// Get current user profile from JWT
export const getMe = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};

// Refresh token
export const refreshToken = async () => {
  const response = await api.post("/auth/refresh");
  const { access_token } = response.data;
  setToken(access_token);
  return access_token;
};

// Logout — call backend + clear local token
export const logout = async () => {
  try {
    await api.post("/auth/logout");
  } catch (error) {
    // Logout even if backend call fails
    console.error("Logout API error:", error);
  } finally {
    removeToken();
  }
};
