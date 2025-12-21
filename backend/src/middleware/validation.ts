import { body, param, query } from "express-validator";

// auth validation
export const validateUser = [
    body("username")
        .trim()
        .isLength({ min: 1, max: 20 })
        .withMessage("Username must be between 1 and 20 characters long")
        .matches(/^[a-zA-Z0-9 ]*$/)
        .withMessage("Username must only have characters numbers and spaces"),
    body("password")
        .trim()
        .isLength({ min: 6, max: 32 })
        .withMessage("Password must be between 6 and 32 characters long")
        .matches(/^[a-zA-Z0-9!@#$%^&*]{6,32}$/)
        .withMessage(
            "Password can only contain letters, numbers, and special characters (!@#$%^&*).",
        ),
];

export const validateLogin = [
    body("username").trim().notEmpty().withMessage("Username is required"),
    body("password").trim().notEmpty().withMessage("Password is required"),
];

// follow validation
export const validateSendFollow = [
    body("recipientId")
        .isInt()
        .withMessage("Recipient ID must be a valid integer"),
];

export const validateUpdateFollow = [
    param("followId").isUUID().withMessage("Follow ID must be a valid UUID"),
    body("status")
        .isIn(["ACCEPTED", "REFUSED"])
        .withMessage("Status must be ACCEPTED or REFUSED"),
];

export const validateBlockUser = [
    param("userId").isInt().withMessage("User ID must be an Integer").toInt(),
];

export const validateDeleteFollow = [
    param("followId").isUUID().withMessage("Follow ID must be a valid UUID"),
];

// post validation
export const validateCreatePost = [
    body("text")
        .trim()
        .isLength({
            min: 1,
            max: 400,
        })
        .withMessage("Post must be between 1 and 400 characters long"),
];

export const validateDeletePost = [
    param("postId").trim().isUUID().withMessage("Post ID must be a valid UUID"),
];

export const validateUpdatePost = [
    body("text")
        .optional()
        .trim()
        .isLength({
            min: 1,
            max: 400,
        })
        .withMessage("Post must be between 1 and 400 characters long"),
    param("postId").trim().isUUID().withMessage("Post ID must be a valid UUID"),
];

export const validateFeedQuery = [
    query("limit")
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage("Limit must be between 1 and 50")
        .toInt(),
    query("cursor")
        .optional()
        .isUUID()
        .withMessage("Cursor must be a valid UUID"),
    query("search")
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage("Search query must be between 1 and 100 characters"),
];

export const validateGetPost = [
    param("postId").trim().isUUID().withMessage("Post ID must be a valid UUID"),
    // paginaton for comments
    query("limit")
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage("Limit must be between 1 and 50")
        .toInt(),
    query("cursor")
        .optional()
        .isUUID()
        .withMessage("Cursor must be a valid UUID"),
    query("search")
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage("Search query must be between 1 and 100 characters"),
];

// user validation
export const validateUpdateUser = [
    body("username")
        .trim()
        .isLength({ min: 1, max: 20 })
        .withMessage("Username must be between 1 and 20 characters long")
        .matches(/^[a-zA-Z0-9 ]*$/)
        .withMessage("Username must only have characters numbers and spaces"),
    body("password")
        .trim()
        .isLength({ min: 6, max: 32 })
        .withMessage("Password must be between 6 and 32 characters long")
        .matches(/^[a-zA-Z0-9!@#$%^&*]{6,32}$/)
        .withMessage(
            "Password can only contain letters, numbers, and special characters (!@#$%^&*).",
        ),
    body("about")
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage("About me has a maximum length of 200 characters"),
    body("email")
        .optional()
        .trim()
        .isEmail()
        .withMessage("Email must be a valid email, e.g. example@gmail.com"),
];

export const validatePaginationQuery = [
    query("limit")
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage("Limit must be between 1 and 50")
        .toInt(),
    query("cursor")
        .optional()
        .isUUID()
        .withMessage("Cursor must be a valid UUID"),
    query("search")
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage("Search query must be between 1 and 100 characters"),
];

export const validateProfilePicture = [
    body("file").custom((v, { req }) => {
        if (!req.file) {
            throw new Error("File is required");
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/svg+xml",
            "image/webp",
        ];
        if (!allowedTypes.includes(req.file.mimetype)) {
            throw new Error("Only jpeg, png, svg, and webp are allowed");
        }

        return true;
    }),
];
