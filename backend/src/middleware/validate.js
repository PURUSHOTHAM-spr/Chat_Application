import { validationResult, body } from "express-validator";

/**
 * Middleware to check validation results and return errors if any.
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array().map((e) => e.msg).join(", "),
      errors: errors.array(),
    });
  }
  next();
};

// Validation rules for registration
export const registerRules = [
  body("fullName")
    .trim()
    .notEmpty().withMessage("Full name is required")
    .isLength({ min: 2, max: 50 }).withMessage("Name must be 2-50 characters"),
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email format"),
  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

// Validation rules for login
export const loginRules = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email format"),
  body("password")
    .notEmpty().withMessage("Password is required"),
];

// Validation rules for sending messages
export const messageRules = [
  body("conversationId")
    .notEmpty().withMessage("Conversation ID is required")
    .isMongoId().withMessage("Invalid conversation ID"),
  body("content")
    .notEmpty().withMessage("Message content is required"),
];
