import { z } from "zod";

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  isEmailVerified: z.boolean(),
  role: z.string(),
  avatarObjectKey: z.string().nullable(),
});

export const AuthSuccessSchema = z.object({
  message: z.string(),
  user: AuthUserSchema,
  accessToken: z.string(),
  redirectTo: z.string().optional(),
});
