import type { NextFunction, Request, Response } from "express";

const ApiError = require("../../../exceptions/ApiError");
const userService = require("./user.service");

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
        user: authData.user,
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
        user: authData.user,
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
        user: authData.user,
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
      return res.status(200).json({ user });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to load profile";
      return next(ApiError.BadRequest(errorMessage));
    }
  }
}

module.exports = new UserController();
