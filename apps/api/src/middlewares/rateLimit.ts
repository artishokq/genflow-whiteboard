export {};

const rateLimit = require("express-rate-limit");

const registerFlowLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: { message: "Too many registration attempts. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authSessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { message: "Too many requests. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { registerFlowLimiter, authSessionLimiter };
