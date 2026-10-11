import {csrfFetch,clearCsrfToken} from '../../lib/csrf-fetch';
const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const login = async (email: string, password: string) => {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const error: any = new Error(errorData?.message || "Unable to login");
    error.status = response.status;
    throw error;
  }

  clearCsrfToken();
  return await response.json();
};

export const getMe = async () => {
  const response = await fetch(`${baseUrl}/auth/me`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const error: any = new Error(errorData?.message || "Unable to fetch session");
    error.status = response.status;
    throw error;
  }

  return await response.json();
};

export const completeProfile = async (payload: {
  firstName: string;
  lastName: string;
}) => {
  const response = await csrfFetch(`${baseUrl}/auth/complete-profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const error: any = new Error(errorData?.message || "Unable to complete profile");
    error.status = response.status;
    throw error;
  }

  return await response.json();
};

export const logout = async () => {
  const response = await csrfFetch(`${baseUrl}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Logout failed");
  }

  return await response.json();
};