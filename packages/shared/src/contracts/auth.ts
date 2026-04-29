export type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isEmailVerified: boolean;
  role: string;
  avatarObjectKey: string | null;
};

export type AuthSuccess = {
  message: string;
  user: AuthUser;
  accessToken: string;
  redirectTo?: string;
};
