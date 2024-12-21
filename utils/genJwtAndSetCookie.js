import jwt from "jsonwebtoken";

// *** check with zaryab if we are going to have separate secrets for buyer and seller

function genJwtAndSetCookie(id, role, res) {
  
  const authToken = jwt.sign(
    { id, role },
    process.env.ACCESS_TOKEN_SECRET_KEY, // the existing approach that uses VERIFICATION_SECRET_KEY for certain verification processes (e.g., password resetting). Instead, we'll introduce a dedicated function to securely set cookies during such processes or you can write it directly in thier controller.ensure that the ACCESS_TOKEN_SECRET_KEY is included in the authentication token when a user logs in. This token should then be verified through the VerifyUser.js middleware, which will validate the token using the ACCESS_TOKEN_SECRET_KEY.
    {
      expiresIn: "7d",
    }
  );

  res.cookie("authToken", authToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export default genJwtAndSetCookie;
