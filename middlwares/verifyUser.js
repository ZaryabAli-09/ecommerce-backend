// import jwt, { decode } from "jsonwebtoken";
// import { Buyer } from "../models/buyer.models.js";
// import { ApiError } from "../utils/apiError.js";

// async function verifyUser(req, res, next) {
//   try {
//     const authToken = req.cookies.access_token;
//     const refreshToken = req.cookies.refresh_token;

//     // Step 1: Ensure both tokens are provided
//     if (!authToken && !refreshToken) {
//       throw new ApiError(401, "Session expired! Please log in again.");
//     }

//     let decoded;

//     // Step 2: Verify access token
//     if (authToken) {
//       try {
//         decoded = jwt.verify(authToken, process.env.ACCESS_TOKEN_SECRET_KEY);
//         // If access token is valid, attach user and proceed
//         const buyer = await Buyer.findById(decoded.id);
//         if (!buyer) throw new ApiError(401, "Unauthorized access.");

//         req.buyer = buyer;
//         return next(); // Early return if access token is valid
//       } catch (error) {
//         // If access token is expired, log the error and proceed to refresh token
//         if (error.name === "TokenExpiredError") {
//
//         } else {
//           throw new ApiError(401, "Invalid access token.");
//         }
//       }
//     }

//     // Step 3: Verify refresh token (only if access token is expired or not provided)
//     try {
//       const refreshDecoded = jwt.verify(
//         refreshToken,
//         process.env.REFRESH_TOKEN_SECRET_KEY
//       );

//       const buyerId = refreshDecoded.id;
//       const buyer = await Buyer.findById(buyerId);
//       if (!buyer) throw new ApiError(401, "Unauthorized access.");

//       // Step 4: Generate a new access token
//       const newAccessToken = jwt.sign(
//         { id: buyer._id, role: buyer.role },
//         process.env.ACCESS_TOKEN_SECRET_KEY,
//         { expiresIn: "1d" }
//       );

//       // Set the new access token in cookies
//       res.cookie("access_token", newAccessToken, {
//         httpOnly: true,
//         secure: true,
//         sameSite: "None",
//       });

//       req.buyer = buyer; // Attach user to request
//       return next();
//     } catch (refreshError) {
//       if (refreshError.name === "TokenExpiredError") {
//         throw new ApiError(401, "Session expired! Please log in again.");
//       }
//       throw new ApiError(401, "Invalid refresh token.");
//     }
//   } catch (error) {
//     next(error);
//   }
// }

// export { verifyUser };
import jwt, { decode } from "jsonwebtoken";
import { Buyer } from "../models/buyer.models.js";
import { ApiError } from "../utils/apiError.js";

async function verifyUser(req, res, next) {
  try {
    // not suitable for mobile app

    // const authToken = req.cookies.access_token;
    // const refreshToken = req.cookies.refresh_token;

    // suitable for mobile app

    console.log("request recieve middlware ..........");

    const authToken = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : req.cookies.access_token;

    const refreshToken =
      req.headers["x-refresh-token"] || req.cookies.refresh_token;

    // console.log("authToken =", String(authToken).slice(0, 5));
    // console.log("refreshToken =", String(refreshToken).slice(0, 5));

    // Step 1: Ensure both tokens are provided
    if (!authToken && !refreshToken) {
      throw new ApiError(401, "Session expired! Please log in again.");
    }

    let decoded;

    // Step 2: Verify access token
    if (authToken) {
      try {
        decoded = jwt.verify(authToken, process.env.ACCESS_TOKEN_SECRET_KEY);
        // If access token is valid, attach user and proceed
        const buyer = await Buyer.findById(decoded.id);
        if (!buyer) throw new ApiError(401, "Unauthorized access.");

        req.buyer = buyer;
        return next(); // Early return if access token is valid
      } catch (error) {
        // If access token is expired, log the error and proceed to refresh token
        if (error.name === "TokenExpiredError") {
          console.log(
            "Access token expired. Proceeding to verify refresh token..."
          );
        } else {
          throw new ApiError(401, "Invalid access token.");
        }
      }
    }

    // Step 3: Verify refresh token (only if access token is expired or not provided)
    try {
      const refreshDecoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET_KEY
      );

      const buyerId = refreshDecoded.id;
      const buyer = await Buyer.findById(buyerId);
      if (!buyer) throw new ApiError(401, "Unauthorized access.");

      // Step 4: Generate a new access token
      const newAccessToken = jwt.sign(
        { id: buyer._id, role: buyer.role },
        process.env.ACCESS_TOKEN_SECRET_KEY,
        { expiresIn: "1d" }
      );

      // Set the new access token in cookies
      res.cookie("access_token", newAccessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
      });

      req.buyer = buyer; // Attach user to request
      console.log("New access token issued.");
      return next();
    } catch (refreshError) {
      if (refreshError.name === "TokenExpiredError") {
        throw new ApiError(401, "Session expired! Please log in again.");
      }
      throw new ApiError(401, "Invalid refresh token.");
    }
  } catch (error) {
    next(error);
  }
}

export { verifyUser };
