import jwt from "jsonwebtoken";
import { Admin } from "../models/admin.models.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import bcryptjs from "bcryptjs";

async function adminLogin(req, res, next) {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      throw new ApiError(400, "Email and password are required.");
    }

    // Find the admin
    const admin = await Admin.findOne({ email });
    if (!admin) {
      throw new ApiError(401, "Invalid credentials.");
    }

    // Verify password
    const isPasswordValid = await bcryptjs.compare(password, admin.password);
    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid credentials.");
    }

    // Generate JWT token for admi

    const access_token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.ADMIN_ACCESS_TOKEN_SECRET_KEY, // Ensure this is defined in your environment variables
      { expiresIn: "30d" }
    );

    res
      .status(200)
      .cookie("access_token", access_token, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
      })
      .json(new ApiResponse(null, "Login successfully."));
  } catch (error) {
    next(error);
  }
}

export { adminLogin };
