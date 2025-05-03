import jwt from "jsonwebtoken";
import { ApiError } from "../utils/apiError.js";
import { Seller } from "../models/seller.model.js";

async function verifySeller(req, res, next) {
  try {
    const token = req.cookies.seller_access_token;
    const refreshToken = req.cookies.seller_refresh_token;

    // Check if token is present
    if (!token && !refreshToken) {
      throw new ApiError(401, "Session expired! Please log in again.");
    }

    let decoded;

    if (token) {
      try {
        decoded = jwt.verify(token, process.env.SELLER_ACCESS_TOKEN_SECRET_KEY);

        const sellerId = decoded.id;
        const seller = await Seller.findById(sellerId);

        if (decoded.role !== seller.role) {
          throw new ApiError(401, "Unauthorized access.");
        }
        if (!seller) {
          throw new ApiError(401, "Unauthorized access.");
        }

        req.seller = seller;
        return next();
      } catch (error) {
        // If access token is expired, log the error and proceed to refresh token
        if (error.name === "TokenExpiredError") {
          console.log(
            "Access token expired. Proceeding to verify refresh token..."
          );
        } else {
          console.log(error);
          throw new ApiError(401, "Invalid access tokenn.");
        }
      }
    }

    // Step 3: Verify refresh token (only if access token is expired or not provided)
    try {
      const refreshDecoded = jwt.verify(
        refreshToken,
        process.env.SELLER_REFRESH_TOKEN_SECRET_KEY
      );

      const sellerId = refreshDecoded.id;
      const seller = await Buyer.findById(sellerId);
      if (decoded.role !== seller.role) {
        throw new ApiError(401, "Unauthorized access.");
      }
      if (!seller) {
        throw new ApiError(401, "Unauthorized access.");
      }

      // Step 4: Generate a new access token
      const newAccessToken = jwt.sign(
        { id: seller._id, role: seller.role },
        process.env.SELLER_ACCESS_TOKEN_SECRET_KEY,
        { expiresIn: "1d" }
      );

      // Set the new access token in cookies
      res.cookie("seller_access_token", newAccessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
      });

      req.seller = seller; // Attach user to request
      console.log("New access token issued.");
      return next();
    } catch (refreshError) {
      if (refreshError.name === "TokenExpiredError") {
        throw new ApiError(401, "Session expired! Please log in again.");
      }
      throw new ApiError(401, "Invalid refresh token.");
    }
  } catch (error) {
    // Pass any other errors to the error handler
    next(error);
  }
}

export { verifySeller };
