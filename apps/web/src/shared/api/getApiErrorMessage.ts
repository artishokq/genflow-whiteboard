import axios from "axios";
import type { TFunction } from "i18next";

const API_ERROR_TRANSLATION_KEYS: Record<string, string> = {
  "Invalid email or password": "errors.invalidCredentials",
  "email and password are required": "errors.emailAndPasswordRequired",
  "email and code are required": "errors.emailAndCodeRequired",
  "email and currentPassword are required":
    "errors.emailAndCurrentPasswordRequired",
  "currentPassword and newPassword are required":
    "errors.currentAndNewPasswordRequired",
  "email, code and newPassword are required":
    "errors.emailCodeAndPasswordRequired",
  "email is required": "errors.emailRequired",
  "Invalid email address": "errors.invalidEmail",
  "password is required": "errors.passwordRequired",
  "Password must be at least 8 and fewer than 32 characters":
    "errors.passwordLength",
  "Password must contain at least one digit": "errors.passwordDigit",
  "Password must contain at least one letter": "errors.passwordLetter",
  "firstName is required": "errors.firstNameRequired",
  "lastName is required": "errors.lastNameRequired",
  "firstName must contain at least 2 letters; spaces, hyphens and apostrophes are allowed":
    "errors.firstNameInvalid",
  "lastName must contain at least 2 letters; spaces, hyphens and apostrophes are allowed":
    "errors.lastNameInvalid",
  "Registration request not found or expired": "errors.registrationExpired",
  "Email change request not found or expired": "errors.emailChangeExpired",
  "Password reset request not found or expired": "errors.passwordResetExpired",
  "Activation code expired": "errors.activationCodeExpired",
  "Invalid activation code": "errors.invalidActivationCode",
  "Invalid current password": "errors.invalidCurrentPassword",
  "New email matches current email": "errors.newEmailMatchesCurrent",
  "User with this email already exists": "errors.userAlreadyExists",
  "Email is not verified": "errors.emailNotVerified",
  Unauthorized: "errors.unauthorized",
  "Refresh token is required": "errors.refreshTokenRequired",
  "Too many registration attempts. Try again later.":
    "errors.tooManyRegistrationAttempts",
  "Too many requests. Try again later.": "errors.tooManyRequests",
  "Board not found": "errors.boardNotFound",
  "Snapshot is too large": "errors.snapshotTooLarge",
};

function translateApiError(message: string, t: TFunction): string {
  const key = API_ERROR_TRANSLATION_KEYS[message];
  return key ? t(key) : message;
}

export function getApiErrorMessage(
  error: unknown,
  fallback: string,
  t: TFunction,
): string {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message;
    if (typeof msg === "string" && msg.trim()) {
      return translateApiError(msg.trim(), t);
    }
  }
  if (error instanceof Error && error.message) {
    return translateApiError(error.message, t);
  }
  return fallback;
}
