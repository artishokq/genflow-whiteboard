const Router = require("express").Router;
const userController = require("../modules/auth/user/user.controller");
const { registerValidators } = require("../middlewares/registerValidation");
const { requireAuth } = require("../middlewares/authMiddleware");
const {
  registerFlowLimiter,
  authSessionLimiter,
} = require("../middlewares/rateLimit");
const router = Router();

router.post(
  "/register",
  registerFlowLimiter,
  ...registerValidators,
  userController.register,
);
router.post(
  "/register/confirm",
  registerFlowLimiter,
  userController.confirmRegistration,
);
router.post(
  "/register/resend",
  registerFlowLimiter,
  userController.resendRegistrationCode,
);
router.post("/login", authSessionLimiter, userController.login);
router.post("/logout", authSessionLimiter, userController.logout);
router.get("/refresh", authSessionLimiter, userController.refresh);
router.get("/me", authSessionLimiter, requireAuth, userController.me);

module.exports = router;