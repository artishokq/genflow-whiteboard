export {};

import { rateLimit } from "express-rate-limit";

const TOO_MANY_REQUESTS = { message: "Too many requests. Try again later." };

const registerFlowLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: { message: "Too many registration attempts. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authSessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: TOO_MANY_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
});

const boardApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  message: TOO_MANY_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
});

const boardSnapshotLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 240,
  message: TOO_MANY_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
});

export {
  registerFlowLimiter,
  authSessionLimiter,
  boardApiLimiter,
  boardSnapshotLimiter,
};
