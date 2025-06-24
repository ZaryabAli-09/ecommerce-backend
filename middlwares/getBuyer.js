import { Buyer } from "../models/buyer.models.js";
import jwt from "jsonwebtoken";

// async function getBuyer(req, res, next) {
//   req.buyer = null;

//   try {
//     const authToken = req.cookies.access_token;

//     if (!authToken) {
//       return next();
//     }

//     const decoded = jwt.verify(authToken, process.env.ACCESS_TOKEN_SECRET_KEY);
//     const buyer = await Buyer.findOne(
//       { _id: decoded.id },
//       { cart: 1, wishlist: 1 }
//     );

//     req.buyer = buyer;
//     next();
//   } catch (error) {
//     console.log(error.message);
//     next(error);
//   }
// }

async function getBuyer(req, res, next) {
  req.buyer = null;

  try {
    // Check for access token in both cookies and Authorization header
    const authToken = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : req.cookies.access_token;

    if (!authToken) {
      return next(); // No token means unauthenticated, but not an error
    }

    const decoded = jwt.verify(authToken, process.env.ACCESS_TOKEN_SECRET_KEY);

    const buyer = await Buyer.findOne(
      { _id: decoded.id },
      { cart: 1, wishlist: 1 }
    );

    req.buyer = buyer;
    next();
  } catch (error) {
    console.log("getBuyer middleware error:", error.message);
    // Proceed without buyer info on token failure, don't throw
    next();
  }
}

export default getBuyer;
