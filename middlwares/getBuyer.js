import { Buyer } from "../models/buyer.models.js";
import jwt from "jsonwebtoken";

// This middlware (getBuyer) is added not to verify user but to getuser, user is needed because we want to see if the product that the user is fetching is in his wishlist or not

async function getBuyer(req, res, next) {
  req.buyer = null;

  try {
    const authToken = req.cookies.access_token;

    if (!authToken) {
      return next();
    }

    const decoded = jwt.verify(authToken, process.env.ACCESS_TOKEN_SECRET_KEY);
    const buyer = await Buyer.findOne(
      { _id: decoded.id },
      { cart: 1, wishlist: 1 }
    );

    req.buyer = buyer;
    next();
  } catch (error) {
    console.log(error.message);
    next(error);
  }
}

export default getBuyer;
