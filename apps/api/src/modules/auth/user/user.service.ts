export {};

const crypto = require("node:crypto");
const argon2 = require("argon2");
const { eq, lt } = require("drizzle-orm");
const { db } = require("../../../db/client");
const { users, pendingRegistrations } = require("../../../db/schema");
const mailService = require("../mail/mail.service");
const tokenService = require("../token/token.service");

class UserService {
  normalizeName(rawValue: string, field: string) {
    const normalizedValue = String(rawValue).trim();
    const nameRegex = /^\p{L}+(?:[ '\\-]\p{L}+)*$/u;
    const lettersCount = (value: string) => (value.match(/\p{L}/gu) ?? []).length;

    if (!nameRegex.test(normalizedValue) || lettersCount(normalizedValue) < 2) {
      throw new Error(`${field} must contain at least 2 letters; spaces, hyphens and apostrophes are allowed`);
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

  async requestRegistration(email: string, password: string, firstName: string, lastName: string) {
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
      await db
        .insert(pendingRegistrations)
        .values({
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

    const userData = tokenService.validateRefreshToken(refreshToken) as
      | { id?: string }
      | null;
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
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (foundUsers.length === 0) {
      throw new Error("User not found");
    }

    return foundUsers[0];
  }
}

module.exports = new UserService();