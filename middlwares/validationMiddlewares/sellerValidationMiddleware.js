import Joi from "joi";

const sellerValidationSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "The email must be a valid email address.",
    "string.empty": "Email is required.",
  }),

  password: Joi.string().min(6).allow(null, "").messages({
    "string.min": "Password must be at least 6 characters long.",
    "string.empty": "Password is required.",
  }),
  contactNumber: Joi.string()
    .pattern(/^[0-9]{10,15}$/)
    .required()
    .messages({
      "string.pattern.base": "Contact number must be valid.",
      "string.empty": "Contact number is required.",
    }),
  businessAddress: Joi.string().min(10).required().messages({
    "string.min": "Address must be at least 10 characters long.",
    "string.empty": "Address is required.",
  }),
  brandName: Joi.string().min(2).required().messages({
    "string.min": "Brand name must be at least 2 characters long.",
    "string.empty": "Brand name is required.",
  }),
  brandDescription: Joi.string().min(10).required().messages({
    "string.min": "Brand description must be at least 10 characters long.",
    "string.empty": "Brand description is required.",
  }),

  logo: Joi.string()
    .uri()
    .allow(null, "") // Optional field
    .messages({
      "string.uri": "Logo must be a valid URL.",
    }),
  coverImage: Joi.string()
    .uri()
    .allow(null, "") // Optional field
    .messages({
      "string.uri": "Cover image must be a valid URL.",
    }),
  socialLinks: Joi.object({
    instagram: Joi.string().uri().allow(null, ""),
    facebook: Joi.string().uri().allow(null, ""),
    twitter: Joi.string().uri().allow(null, ""),
    linkedin: Joi.string().uri().allow(null, ""),
  }).allow(null), // Optional field
  bankDetails: Joi.object({
    bankName: Joi.string().min(3).required(),
    accountNumber: Joi.string().min(10).required(),
    accountHolderName: Joi.string().min(3).required(),
  }).allow(null), // Optional field
  status: Joi.string()
    .valid("pending", "approved", "rejected", "blocked")
    .default("pending")
    .messages({
      "any.only":
        "Status must be one of ['pending', 'approved', 'rejected', 'blocked'].",
    }),
  adminNotes: Joi.string().allow(null, "").messages({
    "string.base": "Admin notes must be a string.",
  }),
  otp: Joi.string().allow(null, "").messages({
    "string.base": "OTP must be a string.",
  }),
});

const validateSeller = (req, res, next) => {
  const { error } = sellerValidationSchema.validate(req.body, {
    abortEarly: true, // Stop at the first error
  });

  if (error) {
    return res.status(400).json({
      status: "error",
      data: null,
      message: error.message, // Send only the first error message
    });
  }
  next();
};

export { validateSeller };
