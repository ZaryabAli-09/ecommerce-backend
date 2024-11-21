import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

async function verifyUser(req, res, next) {
  try {
    const authToken = req.cookies.access_token;
    const refreshToken = req.cookies.refresh_token;

    // Check if token is present
    if (!authToken && !refreshToken) {
      return res.status(401).json({
        message: "Authentication failed! auth tokens not present",
      });
    }

    // Verify the token and find the user
    jwt.verify(
      authToken,
      process.env.ACCESS_TOKEN_SECRET_KEY,

      async (err, decoded) => {
        if (err) {
          // access token is expired
          // check refresh token
          jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET_KEY,
            async (refreshErr, refreshDecoded) => {
              if (refreshErr) {
                // Both tokens are invalid, send an error message and prompt for login
                return res
                  .status(401)
                  .json({ message: "Session expired please login again" });
              } else {
                console.log("generated new auth token");
                const newAuthToken = jwt.sign(
                  { _id: refreshDecoded._id },
                  process.env.ACCESS_TOKEN_SECRET_KEY,
                  { expiresIn: "1d" }
                );
                const newRefreshToken = jwt.sign(
                  { _id: refreshDecoded._id },
                  process.env.REFRESH_TOKEN_SECRET_KEY,
                  { expiresIn: "10d" }
                );
                // Set the new tokens as cookies in the response
                res.cookie("access_token", newAuthToken, {
                  httpOnly: true,
                  secure: true,
                  sameSite: "None",
                });
                res.cookie("refresh_token", newRefreshToken, {
                  httpOnly: true,
                  secure: true,
                  sameSite: "None",
                });

                // Continue processing the request with the new auth token
                const userId = refreshDecoded._id;
                const user = await User.findById(userId);

                // // Check if user exists
                if (!user) {
                  return res.status(404).json({
                    message: "User not found",
                  });
                }
                // // Attach user to the request object for further use
                req.user = user;

                // // Proceed to the next middleware or route
                next();
              }
            }
          );
        } else {
          // Auth token is valid, continue with the request
          const userId = decoded._id;
          const user = await User.findById(userId);

          // // Check if user exists
          if (!user) {
            return res.status(404).json({
              message: "User not found",
            });
          }
          // // Attach user to the request object for further use
          req.user = user;

          // // Proceed to the next middleware or route
          next();
        }
      }
    );
  } catch (error) {
    console.log(error.name);
    next(error);
  }
}

export { verifyUser };
