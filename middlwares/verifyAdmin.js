import jwt from "jsonwebtoken";
import { ApiError } from "../utils/apiError.js";
import { Admin } from "../models/admin.models.js";

async function verifyAdmin(req, res, next) {
  try {
    const token = req.cookies.admin_access_token;

    // Check if token is present
    if (!token) {
      throw new ApiError(401, "Session expired! Please log in again.");
    }

    // Verify the token
    const decoded = jwt.verify(
      token,
      process.env.ADMIN_ACCESS_TOKEN_SECRET_KEY
    );

    if (decoded.role !== "admin") {
      throw new ApiError(
        403,
        "You are not authorized to access this resource."
      );
    }

    const adminId = decoded.id; // Attach admin data to the request object
    const admin = await Admin.findById(adminId);

    // optional check not necessary
    if (!admin) {
      throw new ApiError(
        401,
        "You are not authorized to access this resource."
      );
    }
    req.admin = admin; //passing whole admin to req object
    // Proceed to next middleware function if the user is an admin
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new ApiError(401, "Session expired! Please log in again.");
    }
    // Pass any other errors to the error handler
    next(error);
  }
}

export { verifyAdmin };
