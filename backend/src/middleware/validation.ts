import { body, check, param, query } from "express-validator";

// auth validation
export const validateUser = [
    body("username")
        .trim()
        .isLength({ min: 1, max: 20 })
        .withMessage("Username must be between 1 and 20 characters long")
        .matches(/^[a-zA-Z0-9-_]*$/)
        .withMessage(
            "Username must only have characters numbers and dashes/underscores",
        ),
    body("password")
        .trim()
        .isLength({ min: 8, max: 128 })
        .withMessage("Password must be between 8 and 128 characters long")
        .matches(/^[a-zA-Z0-9!@#$%^&*]{8,128}$/)
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
        .optional({ checkFalsy: true })
        .trim()
        .custom((value, { req }) => {
            const hasFiles = req.files && (req.files as any[]).length > 0;
            if (!value && !hasFiles) {
                throw new Error("Post must contain text or at least one file");
            }
            return true;
        })
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

export const validateCreateComment = [
    param("postId").trim().isUUID().withMessage("Post ID must be a valid UUID"),
    body("text")
        .optional({ checkFalsy: true })
        .trim()
        .custom((value, { req }) => {
            const hasFiles = req.files && (req.files as any[]).length > 0;
            if (!value && !hasFiles) {
                throw new Error(
                    "Comment must contain text or at least one file",
                );
            }
            return true;
        })
        .isLength({ min: 1, max: 200 })
        .withMessage("Comment must be between 1 and 200 characters long"),
];

export const validateUpdateComment = [
    param("postId").trim().isUUID().withMessage("Post ID must be a valid UUID"),
    param("commentId")
        .trim()
        .isUUID()
        .withMessage("Comment ID must be a valid UUID"),
    body("text")
        .optional()
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage("Comment must be between 1 and 200 characters long"),
];

export const validateDeleteComment = [
    param("postId").trim().isUUID().withMessage("Post ID must be a valid UUID"),
    param("commentId")
        .trim()
        .isUUID()
        .withMessage("Comment ID must be a valid UUID"),
];

export const validateLikePost = [
    param("postId").isUUID().withMessage("Post ID must be a valid UUID"),
];

export const validateLikeComment = [
    param("postId").isUUID().withMessage("Post ID must be a valid UUID"),
    param("commentId").isUUID().withMessage("Comment ID must be a valid UUID"),
];

// user validation
export const validateUpdateUser = [
    body("username")
        .trim()
        .isLength({ min: 1, max: 20 })
        .withMessage("Username must be between 1 and 20 characters long")
        .matches(/^[a-zA-Z0-9-_]*$/)
        .withMessage(
            "Username must only have characters numbers and dashes/underscores",
        ),
    body("password")
        .trim()
        .isLength({ min: 8, max: 128 })
        .withMessage("Password must be between 8 and 128 characters long")
        .matches(/^[a-zA-Z0-9!@#$%^&*]{8,128}$/)
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
    check("file").custom((_, { req }) => {
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

export const validateUsername = [
    body("username")
        .trim()
        .isLength({ min: 1, max: 20 })
        .withMessage("Username must be between 1 and 20 characters long")
        .matches(/^[a-zA-Z0-9-_]*$/)
        .withMessage(
            "Username must only have characters numbers and dashes/underscores",
        ),
];
