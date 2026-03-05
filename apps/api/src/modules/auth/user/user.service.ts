export {};

import crypto from "node:crypto";

import argon2 from "argon2";
import { eq, lt } from "drizzle-orm";

import { db } from "../../../db/client";
import { pendingRegistrations, tokens, users } from "../../../db/schema";
import r2StorageService, { buildUserAvatarKey } from "../../boards/r2StorageService";
import mailService from "../mail/mail.service";
import tokenService from "../token/token.service";

const CODE_TTL_MS = 15 * 60 * 1000;

type PendingCodeEntry = {
  codeHash: string;
  expiresAt: Date;
};

const pendingEmailChanges = new Map<string, PendingCodeEntry>();
const pendingPasswordResets = new Map<string, PendingCodeEntry>();

class UserService {
  normalizeName(rawValue: string, field: string) {
    const normalizedValue = String(rawValue).trim();
    const nameRegex = /^\p{L}+(?:[ '\\-]\p{L}+)*$/u;
    const lettersCount = (value: string) =>
      (value.match(/\p{L}/gu) ?? []).length;

    if (!nameRegex.test(normalizedValue) || lettersCount(normalizedValue) < 2) {
      throw new Error(
        `${field} must contain at least 2 letters; spaces, hyphens and apostrophes are allowed`,
      );
    }

    return normalizedValue;
  }

  async cleanupExpiredPendingRegistrations() {
    await db
      .delete(pendingRegistrations)
      .where(lt(pendingRegistrations.expiresAt, new Date()));
  }

  generateActivationCode() {
    return String(crypto.randomInt(100000, 1000000));
  }

  validatePasswordPolicy(rawPassword: string) {
    const password = String(rawPassword);
    if (password.length < 8 || password.length > 31) {
      throw new Error("Password must be at least 8 and fewer than 32 characters");
    }
    if (!/\d/.test(password)) {
      throw new Error("Password must contain at least one digit");
    }
    if (!/\p{L}/u.test(password)) {
      throw new Error("Password must contain at least one letter");
    }
  }

  async requestRegistration(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) {
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedFirstName = this.normalizeName(firstName, "firstName");
    const normalizedLastName = this.normalizeName(lastName, "lastName");

    await this.cleanupExpiredPendingRegistrations();

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser.length > 0) {
      throw new Error("User with this email already exists");
    }

    this.validatePasswordPolicy(password);
    const passwordHash = await argon2.hash(password);
    const activationCode = this.generateActivationCode();
    const activationCodeHash = await argon2.hash(activationCode);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const existingPendingRegistration = await db
      .select({ id: pendingRegistrations.id })
      .from(pendingRegistrations)
      .where(eq(pendingRegistrations.email, normalizedEmail))
      .limit(1);

    if (existingPendingRegistration.length > 0) {
      await db
        .update(pendingRegistrations)
        .set({
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          passwordHash,
          activationCodeHash,
          expiresAt,
          attempts: 0,
          updatedAt: new Date(),
        })
        .where(eq(pendingRegistrations.email, normalizedEmail));
    } else {
      await db.insert(pendingRegistrations).values({
        email: normalizedEmail,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        passwordHash,
        activationCodeHash,
        expiresAt,
      });
    }

    await mailService.sendActivationMail(normalizedEmail, activationCode);

    return {
      email: normalizedEmail,
      expiresAt,
      message: "Activation code sent",
    };
  }

  async confirmRegistration(email: string, code: string) {
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedCode = String(code).trim();

    await this.cleanupExpiredPendingRegistrations();

    const pending = await db
      .select()
      .from(pendingRegistrations)
      .where(eq(pendingRegistrations.email, normalizedEmail))
      .limit(1);

    if (pending.length === 0) {
      throw new Error("Registration request not found or expired");
    }

    const pendingRegistration = pending[0];

    if (pendingRegistration.expiresAt.getTime() < Date.now()) {
      await db
        .delete(pendingRegistrations)
        .where(eq(pendingRegistrations.email, normalizedEmail));
      throw new Error("Activation code expired");
    }

    const isCodeValid = await argon2.verify(
      pendingRegistration.activationCodeHash,
      normalizedCode,
    );

    if (!isCodeValid) {
      await db
        .update(pendingRegistrations)
        .set({
          attempts: pendingRegistration.attempts + 1,
          updatedAt: new Date(),
        })
        .where(eq(pendingRegistrations.email, normalizedEmail));
      throw new Error("Invalid activation code");
    }

    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser.length > 0) {
      await db
        .delete(pendingRegistrations)
        .where(eq(pendingRegistrations.email, normalizedEmail));
      throw new Error("User with this email already exists");
    }

    const createdUser = await db.transaction(async (tx: any) => {
      const insertedUsers = await tx
        .insert(users)
        .values({
          firstName: pendingRegistration.firstName,
          lastName: pendingRegistration.lastName,
          email: pendingRegistration.email,
          passwordHash: pendingRegistration.passwordHash,
          isEmailVerified: true,
        })
        .returning({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          isEmailVerified: users.isEmailVerified,
          role: users.role,
          avatarObjectKey: users.avatarObjectKey,
        });

      await tx
        .delete(pendingRegistrations)
        .where(eq(pendingRegistrations.id, pendingRegistration.id));

      return insertedUsers[0];
    });

    const tokens = tokenService.generateTokens({
      id: createdUser.id,
      email: createdUser.email,
      role: createdUser.role,
      isEmailVerified: createdUser.isEmailVerified,
    });

    await tokenService.saveToken(createdUser.id, tokens.refreshToken);

    return {
      user: createdUser,
      tokens,
    };
  }

  async resendRegistrationCode(email: string) {
    const normalizedEmail = String(email).trim().toLowerCase();
    await this.cleanupExpiredPendingRegistrations();

    const pending = await db
      .select()
      .from(pendingRegistrations)
      .where(eq(pendingRegistrations.email, normalizedEmail))
      .limit(1);

    if (pending.length === 0) {
      throw new Error("Registration request not found or expired");
    }

    const activationCode = this.generateActivationCode();
    const activationCodeHash = await argon2.hash(activationCode);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db
      .update(pendingRegistrations)
      .set({
        activationCodeHash,
        expiresAt,
        attempts: 0,
        updatedAt: new Date(),
      })
      .where(eq(pendingRegistrations.email, normalizedEmail));

    await mailService.sendActivationMail(normalizedEmail, activationCode);

    return {
      email: normalizedEmail,
      expiresAt,
      message: "Activation code resent",
    };
  }

  getEmailChangeKey(userId: string, newEmail: string) {
    return `${userId}:${newEmail}`;
  }

  async updateFirstName(userId: string, firstName: string) {
    const normalizedFirstName = this.normalizeName(firstName, "firstName");
    const updated = await db
      .update(users)
      .set({ firstName: normalizedFirstName, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        isEmailVerified: users.isEmailVerified,
        role: users.role,
        avatarObjectKey: users.avatarObjectKey,
      });
    if (updated.length === 0) {
      throw new Error("User not found");
    }
    return updated[0];
  }

  async updateLastName(userId: string, lastName: string) {
    const normalizedLastName = this.normalizeName(lastName, "lastName");
    const updated = await db
      .update(users)
      .set({ lastName: normalizedLastName, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        isEmailVerified: users.isEmailVerified,
        role: users.role,
        avatarObjectKey: users.avatarObjectKey,
      });
    if (updated.length === 0) {
      throw new Error("User not found");
    }
    return updated[0];
  }

  async requestEmailChange(
    userId: string,
    newEmail: string,
    currentPassword: string,
  ) {
    const normalizedEmail = String(newEmail).trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error("email is required");
    }

    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (foundUsers.length === 0) {
      throw new Error("User not found");
    }
    const user = foundUsers[0];

    const isCurrentPasswordValid = await argon2.verify(
      user.passwordHash,
      String(currentPassword),
    );
    if (!isCurrentPasswordValid) {
      throw new Error("Invalid current password");
    }
    if (user.email === normalizedEmail) {
      throw new Error("New email matches current email");
    }

    const emailUsed = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);
    if (emailUsed.length > 0) {
      throw new Error("User with this email already exists");
    }

    const code = this.generateActivationCode();
    const codeHash = await argon2.hash(code);
    pendingEmailChanges.set(this.getEmailChangeKey(userId, normalizedEmail), {
      codeHash,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });
    await mailService.sendEmailChangeCodeMail(normalizedEmail, code);
    return { email: normalizedEmail };
  }

  async confirmEmailChange(userId: string, newEmail: string, code: string) {
    const normalizedEmail = String(newEmail).trim().toLowerCase();
    const normalizedCode = String(code).trim();
    const key = this.getEmailChangeKey(userId, normalizedEmail);
    const pending = pendingEmailChanges.get(key);
    if (!pending || pending.expiresAt.getTime() < Date.now()) {
      pendingEmailChanges.delete(key);
      throw new Error("Email change request not found or expired");
    }
    const isCodeValid = await argon2.verify(pending.codeHash, normalizedCode);
    if (!isCodeValid) {
      throw new Error("Invalid activation code");
    }

    const emailUsed = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);
    if (emailUsed.length > 0) {
      throw new Error("User with this email already exists");
    }

    const updated = await db
      .update(users)
      .set({ email: normalizedEmail, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        isEmailVerified: users.isEmailVerified,
        role: users.role,
        avatarObjectKey: users.avatarObjectKey,
      });
    if (updated.length === 0) {
      throw new Error("User not found");
    }
    pendingEmailChanges.delete(key);

    const user = updated[0];
    const authTokens = tokenService.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    });
    await tokenService.saveToken(user.id, authTokens.refreshToken);
    return { user, tokens: authTokens };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (foundUsers.length === 0) {
      throw new Error("User not found");
    }
    const user = foundUsers[0];
    const isCurrentPasswordValid = await argon2.verify(
      user.passwordHash,
      String(currentPassword),
    );
    if (!isCurrentPasswordValid) {
      throw new Error("Invalid current password");
    }

    this.validatePasswordPolicy(newPassword);
    const passwordHash = await argon2.hash(String(newPassword));
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
    await db.delete(tokens).where(eq(tokens.userId, userId));
    return { message: "Password updated successfully" };
  }

  async requestPasswordReset(email: string) {
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error("email is required");
    }

    const foundUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (foundUsers.length === 0) {
      return { email: normalizedEmail };
    }

    const code = this.generateActivationCode();
    const codeHash = await argon2.hash(code);
    pendingPasswordResets.set(normalizedEmail, {
      codeHash,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });
    await mailService.sendPasswordResetCodeMail(normalizedEmail, code);
    return { email: normalizedEmail };
  }

  async resendPasswordResetCode(email: string) {
    const normalizedEmail = String(email).trim().toLowerCase();
    const pending = pendingPasswordResets.get(normalizedEmail);
    if (!pending || pending.expiresAt.getTime() < Date.now()) {
      pendingPasswordResets.delete(normalizedEmail);
      throw new Error("Password reset request not found or expired");
    }

    const code = this.generateActivationCode();
    const codeHash = await argon2.hash(code);
    pendingPasswordResets.set(normalizedEmail, {
      codeHash,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });
    await mailService.sendPasswordResetCodeMail(normalizedEmail, code);
    return { email: normalizedEmail };
  }

  async confirmPasswordReset(email: string, code: string, newPassword: string) {
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedCode = String(code).trim();
    const pending = pendingPasswordResets.get(normalizedEmail);
    if (!pending || pending.expiresAt.getTime() < Date.now()) {
      pendingPasswordResets.delete(normalizedEmail);
      throw new Error("Password reset request not found or expired");
    }

    const isCodeValid = await argon2.verify(pending.codeHash, normalizedCode);
    if (!isCodeValid) {
      throw new Error("Invalid activation code");
    }

    this.validatePasswordPolicy(newPassword);
    const passwordHash = await argon2.hash(String(newPassword));
    const updated = await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.email, normalizedEmail))
      .returning({ id: users.id });
    if (updated.length === 0) {
      throw new Error("User not found");
    }

    pendingPasswordResets.delete(normalizedEmail);
    await db.delete(tokens).where(eq(tokens.userId, updated[0].id));
    return { message: "Password updated successfully" };
  }

  // логин пользователя
  async login(email: string, password: string) {
    const normalizedEmail = String(email).trim().toLowerCase();
    const rawPassword = String(password);

    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (foundUsers.length === 0) {
      throw new Error("Invalid email or password");
    }

    const user = foundUsers[0];
    const isPasswordValid = await argon2.verify(user.passwordHash, rawPassword);
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    if (!user.isEmailVerified) {
      throw new Error("Email is not verified");
    }

    const tokens = tokenService.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    });

    await tokenService.saveToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        role: user.role,
        avatarObjectKey: user.avatarObjectKey ?? null,
      },
      tokens,
    };
  }

  // выход пользователя
  async logout(refreshToken: string) {
    if (!refreshToken) {
      throw new Error("Refresh token is required");
    }

    await tokenService.removeToken(refreshToken);
    return { message: "Logout successful" };
  }

  // обновление токенов
  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new Error("Refresh token is required");
    }

    const userData = tokenService.validateRefreshToken(refreshToken) as {
      id?: string;
    } | null;
    const tokenFromDb = await tokenService.findToken(refreshToken);

    if (!userData?.id || !tokenFromDb) {
      throw new Error("Unauthorized");
    }

    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, userData.id))
      .limit(1);

    if (foundUsers.length === 0) {
      throw new Error("Unauthorized");
    }

    const user = foundUsers[0];

    const tokens = tokenService.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    });

    await tokenService.saveToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        role: user.role,
        avatarObjectKey: user.avatarObjectKey ?? null,
      },
      tokens,
    };
  }

  async getMe(userId: string) {
    const foundUsers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        isEmailVerified: users.isEmailVerified,
        role: users.role,
        avatarObjectKey: users.avatarObjectKey,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (foundUsers.length === 0) {
      throw new Error("User not found");
    }

    return foundUsers[0];
  }

  async getAvatarObjectKey(userId: string): Promise<string | null> {
    const rows = await db
      .select({ avatarObjectKey: users.avatarObjectKey })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const key = rows[0]?.avatarObjectKey;
    return key && key.length > 0 ? key : null;
  }

  async uploadAvatar(userId: string, buffer: Buffer, mimetype: string) {
    if (!/^image\/(jpeg|png|gif|webp)$/i.test(mimetype)) {
      throw new Error("Only jpeg, png, gif, webp images are allowed");
    }
    const existing = await db
      .select({ avatarObjectKey: users.avatarObjectKey })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!existing[0]) {
      throw new Error("User not found");
    }
    const oldKey = existing[0].avatarObjectKey;
    const key = buildUserAvatarKey(userId, mimetype);
    await r2StorageService.uploadBufferToR2({
      key,
      contentType: mimetype,
      body: buffer,
    });
    if (oldKey) {
      try {
        await r2StorageService.deleteObjectFromR2(oldKey);
      } catch {
        /* ignore */
      }
    }
    const updated = await db
      .update(users)
      .set({ avatarObjectKey: key, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        isEmailVerified: users.isEmailVerified,
        role: users.role,
        avatarObjectKey: users.avatarObjectKey,
      });
    if (!updated[0]) {
      throw new Error("User not found");
    }
    return updated[0];
  }

  async removeAvatar(userId: string) {
    const existing = await db
      .select({ avatarObjectKey: users.avatarObjectKey })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!existing[0]) {
      throw new Error("User not found");
    }
    const oldKey = existing[0].avatarObjectKey;
    const updated = await db
      .update(users)
      .set({ avatarObjectKey: null, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        isEmailVerified: users.isEmailVerified,
        role: users.role,
        avatarObjectKey: users.avatarObjectKey,
      });
    if (!updated[0]) {
      throw new Error("User not found");
    }
    if (oldKey) {
      try {
        await r2StorageService.deleteObjectFromR2(oldKey);
      } catch {
        /* ignore */
      }
    }
    return updated[0];
  }
}

const userService = new UserService();
export default userService;
