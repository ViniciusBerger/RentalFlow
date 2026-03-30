const baseUrl = import.meta.env.VITE_API_URL;

export const login = async (email: string, password: string) => {
  const response = await fetch(baseUrl + "auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Invalid credentials");
  }

  return await response.json();
};

export const getMe = async () => {
  const response = await fetch(baseUrl + "auth/me", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Unable to fetch session");
  }

  return await response.json();
};

export const completeProfile = async (payload: {
  firstName: string;
  lastName: string;
}) => {
  const response = await fetch(baseUrl + "auth/complete-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Unable to complete profile");
  }

  return await response.json();
};

export const logout = async () => {
  const response = await fetch(baseUrl + "auth/logout", {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Logout failed");
  }

  return await response.json();
};