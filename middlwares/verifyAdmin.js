import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

async function verifyAdmin(req, res, next) {
  try {
    const authToken = req.cookies.access_token;

    // Check if token is present
    if (!authToken) {
      return res.status(401).json({
        message: "Unauthorized access! token not present",
      });
    }

    // Verify the token
    const decodedAuthToken = jwt.verify(
      authToken,
      process.env.ACCESS_TOKEN_SECRET_KEY
    );

    // this will find the user with id which will be provided by access_token as iam create access_token with payload of user _id
    const userId = decodedAuthToken.id;
    const user = await User.findById(userId);

    // Check if user is found and is an admin
    if (!user || user.role !== "admin") {
      return res.status(403).json({
        message: "Forbidden access | Only admins can access these routes",
      });
    }

    // Proceed to next middleware function if the user is an admin
    return next();
  } catch (error) {
    next(error);
  }
}

export { verifyAdmin };
