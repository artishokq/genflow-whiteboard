import { create } from "zustand";

import type { AuthUser } from "../api/authApi";

const TOKEN_KEY = "genflow-auth-token";
const USER_KEY = "genflow-auth-user";

function readPersisted(): { accessToken: string | null; user: AuthUser | null } {
  if (typeof window === "undefined") {
    return { accessToken: null, user: null };
  }
  try {
    const accessToken = sessionStorage.getItem(TOKEN_KEY);
    const userRaw = sessionStorage.getItem(USER_KEY);
    const user = userRaw ? (JSON.parse(userRaw) as AuthUser) : null;
    if (user && user.avatarObjectKey === undefined) {
      user.avatarObjectKey = null;
    }
    return { accessToken: accessToken || null, user };
  } catch {
    return { accessToken: null, user: null };
  }
}

function writeToken(accessToken: string | null) {
  if (typeof window === "undefined") {
    return;
  }
  if (accessToken) {
    sessionStorage.setItem(TOKEN_KEY, accessToken);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
  }
}

function writeUser(user: AuthUser | null) {
  if (typeof window === "undefined") {
    return;
  }
  if (user) {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(USER_KEY);
  }
}

type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  setAccessToken: (token: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  clearAuth: () => void;
};

const initial = readPersisted();

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: initial.accessToken,
  user: initial.user,
  setAccessToken: (accessToken) => {
    writeToken(accessToken);
    set({ accessToken });
  },
  setUser: (user) => {
    writeUser(user);
    set({ user });
  },
  clearAuth: () => {
    writeToken(null);
    writeUser(null);
    set({ accessToken: null, user: null });
  },
}));
