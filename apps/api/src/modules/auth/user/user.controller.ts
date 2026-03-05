import type { NextFunction, Request, Response } from "express";

import ApiError from "../../../exceptions/ApiError";
import r2StorageService from "../../boards/r2StorageService";
import tokenService from "../token/token.service";
import userService from "./user.service";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function routeParamUserId(req: Request): string | undefined {
  const raw = req.params.userId;
  if (typeof raw === "string" && raw) {
    return raw;
  }
  if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0]) {
    return raw[0];
  }
  return undefined;
}

function publicUserJson<T extends { avatarObjectKey?: string | null }>(user: T) {
  return { ...user, avatarObjectKey: user.avatarObjectKey ?? null };
}

function resolveRequesterUserId(req: Request): string | undefined {
  let userId: string | undefined = req.user?.id;
  if (!userId) {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      const raw = header.slice("Bearer ".length).trim();
      const p = tokenService.validateAccessToken(raw);
      if (
        p &&
        typeof p !== "string" &&
        typeof (p as { id?: string }).id === "string"
      ) {
        userId = (p as { id: string }).id;
      }
    }
  }
  if (!userId) {
    const q = req.query.token;
    const qt = typeof q === "string" ? q : undefined;
    if (qt) {
      const p = tokenService.validateAccessToken(qt);
      if (
        p &&
        typeof p !== "string" &&
        typeof (p as { id?: string }).id === "string"
      ) {
        userId = (p as { id: string }).id;
      }
    }
  }
  return userId;
}

class UserController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName } = req.body ?? {};

      const registrationRequest = await userService.requestRegistration(
        email,
        password,
        firstName,
        lastName,
      );

      return res.status(200).json({
        message: "Activation code sent to your email",
        data: registrationRequest,
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Registration failed";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async confirmRegistration(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, code } = req.body ?? {};

      if (!email || !code) {
        return next(ApiError.BadRequest("email and code are required"));
      }

      const authData = await userService.confirmRegistration(email, code);

      res.cookie("refreshToken", authData.tokens.refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 15 * 24 * 60 * 60 * 1000,
      });

      return res.status(201).json({
        message: "Registration completed successfully",
        user: publicUserJson(authData.user),
        accessToken: authData.tokens.accessToken,
        redirectTo: "/dashboard",
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Registration confirmation failed";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async resendRegistrationCode(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { email } = req.body ?? {};

      if (!email) {
        return next(ApiError.BadRequest("email is required"));
      }

      const resendResult = await userService.resendRegistrationCode(email);
      return res.status(200).json({
        message: "Activation code resent",
        data: resendResult,
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Resend activation code failed";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body ?? {};
      if (!email || !password) {
        return next(ApiError.BadRequest("email and password are required"));
      }

      const authData = await userService.login(email, password);

      res.cookie("refreshToken", authData.tokens.refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 15 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        message: "Login successful",
        user: publicUserJson(authData.user),
        accessToken: authData.tokens.accessToken,
        redirectTo: "/dashboard",
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Login failed";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken ?? req.body?.refreshToken;
      await userService.logout(refreshToken);
      res.clearCookie("refreshToken");
      return res.status(200).json({ message: "Logout successful" });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Logout failed";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken ?? req.body?.refreshToken;
      const authData = await userService.refresh(refreshToken);

      res.cookie("refreshToken", authData.tokens.refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 15 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        message: "Token refreshed successfully",
        user: publicUserJson(authData.user),
        accessToken: authData.tokens.accessToken,
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Refresh failed";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId || typeof userId !== "string") {
        return next(ApiError.UnauthorizedError());
      }

      const user = await userService.getMe(userId);
      return res.status(200).json({ user: publicUserJson(user) });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to load profile";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async updateFirstName(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId || typeof userId !== "string") {
        return next(ApiError.UnauthorizedError());
      }
      const { firstName } = req.body ?? {};
      const user = await userService.updateFirstName(userId, firstName);
      return res.status(200).json({ user: publicUserJson(user), message: "First name updated" });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to update first name";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async updateLastName(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId || typeof userId !== "string") {
        return next(ApiError.UnauthorizedError());
      }
      const { lastName } = req.body ?? {};
      const user = await userService.updateLastName(userId, lastName);
      return res.status(200).json({ user: publicUserJson(user), message: "Last name updated" });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to update last name";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async requestEmailChange(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId || typeof userId !== "string") {
        return next(ApiError.UnauthorizedError());
      }
      const { email, currentPassword } = req.body ?? {};
      if (!email || !currentPassword) {
        return next(ApiError.BadRequest("email and currentPassword are required"));
      }
      await userService.requestEmailChange(userId, email, currentPassword);
      return res.status(200).json({ message: "Email change code sent" });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to request email change";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async confirmEmailChange(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId || typeof userId !== "string") {
        return next(ApiError.UnauthorizedError());
      }
      const { email, code } = req.body ?? {};
      if (!email || !code) {
        return next(ApiError.BadRequest("email and code are required"));
      }
      const authData = await userService.confirmEmailChange(userId, email, code);

      res.cookie("refreshToken", authData.tokens.refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 15 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        message: "Email updated successfully",
        user: publicUserJson(authData.user),
        accessToken: authData.tokens.accessToken,
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to confirm email change";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId || typeof userId !== "string") {
        return next(ApiError.UnauthorizedError());
      }
      const { currentPassword, newPassword } = req.body ?? {};
      if (!currentPassword || !newPassword) {
        return next(
          ApiError.BadRequest("currentPassword and newPassword are required"),
        );
      }
      const result = await userService.changePassword(
        userId,
        currentPassword,
        newPassword,
      );
      return res.status(200).json(result);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to change password";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async requestPasswordReset(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body ?? {};
      if (!email) {
        return next(ApiError.BadRequest("email is required"));
      }
      await userService.requestPasswordReset(email);
      return res.status(200).json({ message: "Password reset code sent" });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to request password reset";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async resendPasswordReset(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body ?? {};
      if (!email) {
        return next(ApiError.BadRequest("email is required"));
      }
      await userService.resendPasswordResetCode(email);
      return res.status(200).json({ message: "Password reset code resent" });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to resend password reset code";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async confirmPasswordReset(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, code, newPassword } = req.body ?? {};
      if (!email || !code || !newPassword) {
        return next(
          ApiError.BadRequest("email, code and newPassword are required"),
        );
      }
      const result = await userService.confirmPasswordReset(
        email,
        code,
        newPassword,
      );
      return res.status(200).json(result);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to confirm password reset";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId || typeof userId !== "string") {
        return next(ApiError.UnauthorizedError());
      }
      const file = req.file;
      if (!file?.buffer || file.buffer.length === 0) {
        return next(ApiError.BadRequest("file is required"));
      }
      const user = await userService.uploadAvatar(userId, file.buffer, file.mimetype);
      return res.status(201).json({
        message: "Avatar updated",
        user: {
          ...user,
          avatarObjectKey: user.avatarObjectKey ?? null,
        },
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to upload avatar";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async removeAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId || typeof userId !== "string") {
        return next(ApiError.UnauthorizedError());
      }
      const user = await userService.removeAvatar(userId);
      return res.status(200).json({
        message: "Avatar removed",
        user: publicUserJson(user),
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to remove avatar";
      return next(ApiError.BadRequest(errorMessage));
    }
  }

  async serveUserAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      if (!resolveRequesterUserId(req)) {
        return next(ApiError.UnauthorizedError());
      }

      const targetUserId = routeParamUserId(req);
      if (!targetUserId || !UUID_RE.test(targetUserId)) {
        return next(ApiError.BadRequest("userId is required"));
      }

      const objectKey = await userService.getAvatarObjectKey(targetUserId);
      if (!objectKey) {
        return next(ApiError.NotFound("Avatar not set"));
      }
      if (!objectKey.startsWith(`users/${targetUserId}/`)) {
        return next(ApiError.BadRequest("Invalid avatar key"));
      }

      const object = await r2StorageService.getObjectFromR2(objectKey);
      const body = object.Body;
      if (!body) {
        return next(ApiError.NotFound("File not found"));
      }

      const bytes = await body.transformToByteArray();
      if (object.ContentType) {
        res.setHeader("Content-Type", object.ContentType);
      }
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      return res.status(200).send(Buffer.from(bytes));
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to serve avatar";
      return next(ApiError.BadRequest(errorMessage));
    }
  }
}

const userController = new UserController();

export default userController;
