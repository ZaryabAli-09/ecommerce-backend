import { ApiError } from "../utils/apiError.js";

const errorMiddleware = (err, req, res, next) => {
  // Check if the error is an instance of ApiError
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      status: err.status,
      data: err.data,
      message: err.message,
    });
  }

  // Handle generic or unknown errors (e.g., programming errors)
  console.error("Unhandled Error:", err); // Log for debugging (remove in production)

  return res.status(500).json({
    status: "error",
    data: null,
    message: err.message || "Internal Server Error",
  });
};

export { errorMiddleware };
