export {};

import crypto from "node:crypto";

import { eq } from "drizzle-orm";
import jwt, { type JwtPayload } from "jsonwebtoken";

import { db } from "../../../db/client";
import { tokens } from "../../../db/schema";

function getEnv(name: "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

class TokenService {
    hashRefreshToken(refreshToken: string) {
        const pepper =
            process.env.REFRESH_TOKEN_PEPPER ||
            process.env.JWT_REFRESH_SECRET ||
            "";
        if (!pepper) {
            throw new Error("JWT_REFRESH_SECRET or REFRESH_TOKEN_PEPPER must be set");
        }
        return crypto.createHmac("sha256", pepper).update(refreshToken).digest("hex");
    }

    generateTokens(payload: Record<string, unknown>) {
        const accessToken = jwt.sign(payload, getEnv("JWT_ACCESS_SECRET"), { expiresIn: "30m" });
        const refreshToken = jwt.sign(payload, getEnv("JWT_REFRESH_SECRET"), { expiresIn: "15d" });
        return {
            accessToken,
            refreshToken,
        };
    }

    async saveToken(userId: string, refreshToken: string) {
        const refreshTokenHash = this.hashRefreshToken(refreshToken);
        const tokenData = await db
            .select()
            .from(tokens)
            .where(eq(tokens.userId, userId))
            .limit(1);

        if (tokenData.length > 0) {
            const updatedToken = await db
                .update(tokens)
                .set({ refreshToken: refreshTokenHash, updatedAt: new Date() })
                .where(eq(tokens.userId, userId))
                .returning();

            return updatedToken[0];
        }

        const createdToken = await db
            .insert(tokens)
            .values({ userId, refreshToken: refreshTokenHash })
            .returning();

        return createdToken[0];
    }

    async removeToken(refreshToken: string) {
        const refreshTokenHash = this.hashRefreshToken(refreshToken);
        const deletedTokens = await db
            .delete(tokens)
            .where(eq(tokens.refreshToken, refreshTokenHash))
            .returning();

        return deletedTokens[0] ?? null;
    }

    async findToken(refreshToken: string) {
        const refreshTokenHash = this.hashRefreshToken(refreshToken);
        const foundTokens = await db
            .select()
            .from(tokens)
            .where(eq(tokens.refreshToken, refreshTokenHash))
            .limit(1);

        return foundTokens[0] ?? null;
    }

    validateRefreshToken(token: string): JwtPayload | string | null {
        try {
            return jwt.verify(token, getEnv("JWT_REFRESH_SECRET"));
        } catch (e) {
            return null;
        }
    }

    validateAccessToken(token: string): JwtPayload | string | null {
        try {
            return jwt.verify(token, getEnv("JWT_ACCESS_SECRET"));
        } catch (e) {
            return null;
        }
    }
}

const tokenService = new TokenService();

export default tokenService;
