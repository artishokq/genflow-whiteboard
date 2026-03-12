import { apiClient } from "./client";

const rawBase =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001";

export type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isEmailVerified: boolean;
  role: string;
  avatarObjectKey: string | null;
};

/** Avatar image URL for `<img>` / Konva (token query; no Authorization header). */
export function userAvatarSrc(
  userId: string,
  avatarObjectKey: string | null,
  accessToken: string | null,
): string | null {
  if (!avatarObjectKey) {
    return null;
  }
  const u = new URL(
    `${rawBase}/api/users/${encodeURIComponent(userId)}/avatar`,
  );
  if (accessToken) {
    u.searchParams.set("token", accessToken);
  }
  // Cache-busting: new uploaded avatar has a new object key.
  u.searchParams.set("v", avatarObjectKey);
  return u.toString();
}

export type AuthSuccess = {
  message: string;
  user: AuthUser;
  accessToken: string;
  redirectTo?: string;
};

export async function registerRequest(body: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  const { data } = await apiClient.post<{ message: string }>(
    "/api/register",
    body,
  );
  return data;
}

export async function confirmRegistrationRequest(body: {
  email: string;
  code: string;
}) {
  const { data } = await apiClient.post<AuthSuccess>(
    "/api/register/confirm",
    body,
  );
  return data;
}

export async function resendRegistrationCodeRequest(body: { email: string }) {
  const { data } = await apiClient.post<{ message: string }>(
    "/api/register/resend",
    body,
  );
  return data;
}

export async function loginRequest(body: { email: string; password: string }) {
  const { data } = await apiClient.post<AuthSuccess>("/api/login", body);
  return data;
}

export async function logoutRequest() {
  const { data } = await apiClient.post<{ message: string }>("/api/logout", {});
  return data;
}

export async function refreshSessionRequest(options?: {
  signal?: AbortSignal;
}) {
  const { data } = await apiClient.get<AuthSuccess>("/api/refresh", {
    signal: options?.signal,
  });
  return data;
}

export async function getMeRequest() {
  const { data } = await apiClient.get<{ user: AuthUser }>("/api/me");
  return data;
}

export async function updateFirstNameRequest(firstName: string) {
  const { data } = await apiClient.patch<{ user: AuthUser; message: string }>(
    "/api/profile/first-name",
    { firstName },
  );
  return data;
}

export async function updateLastNameRequest(lastName: string) {
  const { data } = await apiClient.patch<{ user: AuthUser; message: string }>(
    "/api/profile/last-name",
    { lastName },
  );
  return data;
}

export async function requestEmailChange(body: {
  email: string;
  currentPassword: string;
}) {
  const { data } = await apiClient.post<{ message: string }>(
    "/api/profile/email/request",
    body,
  );
  return data;
}

export async function confirmEmailChange(body: { email: string; code: string }) {
  const { data } = await apiClient.post<AuthSuccess>("/api/profile/email/confirm", body);
  return data;
}

export async function changePasswordRequest(body: {
  currentPassword: string;
  newPassword: string;
}) {
  const { data } = await apiClient.post<{ message: string }>(
    "/api/profile/password",
    body,
  );
  return data;
}

export async function requestPasswordReset(body: { email: string }) {
  const { data } = await apiClient.post<{ message: string }>(
    "/api/recover/request",
    body,
  );
  return data;
}

export async function resendPasswordReset(body: { email: string }) {
  const { data } = await apiClient.post<{ message: string }>(
    "/api/recover/resend",
    body,
  );
  return data;
}

export async function confirmPasswordReset(body: {
  email: string;
  code: string;
  newPassword: string;
}) {
  const { data } = await apiClient.post<{ message: string }>(
    "/api/recover/confirm",
    body,
  );
  return data;
}

export async function uploadUserAvatarRequest(file: File) {
  const body = new FormData();
  body.append("file", file);
  const { data } = await apiClient.post<{ message: string; user: AuthUser }>(
    "/api/profile/avatar",
    body,
  );
  return data;
}

export async function deleteUserAvatarRequest() {
  const { data } = await apiClient.delete<{ message: string; user: AuthUser }>(
    "/api/profile/avatar",
  );
  return data;
}
