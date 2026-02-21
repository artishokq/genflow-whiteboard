export {};

const { body, validationResult } = require("express-validator");
const ApiError = require("../exceptions/ApiError");

function handleValidationErrors(req: any, res: any, next: any) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const messages = result
      .array()
      .map((e: { msg: string }) => e.msg)
      .join("; ");
    return next(ApiError.BadRequest(messages, result.array()));
  }
  next();
}

const registerValidators = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("email is required")
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("password is required")
    .isLength({ min: 8, max: 31 })
    .withMessage("Password must be at least 8 and fewer than 32 characters")
    .matches(/\d/)
    .withMessage("Password must contain at least one digit")
    .matches(/\p{L}/u)
    .withMessage("Password must contain at least one letter"),
  body("firstName").trim().notEmpty().withMessage("firstName is required"),
  body("lastName").trim().notEmpty().withMessage("lastName is required"),
  handleValidationErrors,
];

module.exports = { registerValidators, handleValidationErrors };
