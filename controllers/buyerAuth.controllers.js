import { Buyer } from "../models/buyer.models.js";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import sendEmail from "../utils/sendEmail.js";
import { OAuth2Client } from "google-auth-library";
import genOtp from "../utils/genOtp.js";
import crypto from "crypto";
import sendEmailHtml from "../utils/sendEmailHtml.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

async function verifyEmail(req, res, next) {
  try {
    // *** Extract verification OTP send by buyer from request ***

    const { verificationOtp } = req.body;

    if (!verificationOtp) {
      throw new ApiError(404, "Otp not found.");
    }

    // *** Extract auth jwt from req cookies ***

    const verificationToken = req.cookies.verificationToken;

    if (!verificationToken) {
      throw new ApiError(400, "Verification token not found.");
    }

    // *** verify the send auth jwt to make sure it is not tampered with ***

    const decodedVerificationToken = jwt.verify(
      verificationToken,
      process.env.VERIFICATION_TOKEN_SECRET_KEY
    );

    // *** Extract the id of buyer from jwt and find the buyer in the db ***

    const id = decodedVerificationToken.id;

    const buyer = await Buyer.findById(id);

    if (!buyer) {
      throw new ApiError(404, "User not found.");
    }

    if (buyer.isVerified) {
      throw new ApiError(400, "User is already verified.");
    }

    // *** make sure the send otp is valid and send before expiration time ***

    const isVerificationOtpValid = await bcryptjs.compare(
      verificationOtp,
      buyer.verificationOtp
    );

    // console.log(isVerificationOtpValid);

    if (!isVerificationOtpValid) {
      throw new ApiError(400, "Invalid Otp.");
    }

    if (Date.now() > buyer.verificationOtpExpiresAt) {
      throw new ApiError(401, "Verification OTP is expired");
    }

    // *** verify the user and delete fields related to verification otp ***

    buyer.isVerified = true;
    buyer.verificationOtp = null;
    buyer.verificationOtpExpiresAt = null;

    // *** save the user to db ***

    await buyer.save();

    // *** send welcome email ***

    await sendEmail(
      process.env.SMTP_GMAIL_USER,
      buyer.email,
      "Account Verified Successfully",
      "Welcome, Your account is successfully verified!"
    );

    // *** send success response ***

    return res
      .status(200)
      .json(new ApiResponse(null, "Email verified successfully!"));
  } catch (error) {
    next(error);
  }
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new ApiError(400, "All fields are required.");
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      throw new ApiError(
        400,
        "Password must be at least 8 characters long, include at least 1 uppercase letter, 1 lowercase letter, and 1 number."
      );
    }

    // *** check if email alreay exists in db ***

    const existingBuyer = await Buyer.findOne({ email });

    if (existingBuyer) {
      throw new ApiError(400, "Email already exists. Please choose another.");
    }

    // *** generate OTP for email verification ***

    const verificationOtp = genOtp();
    const hashedVerificationOtp = await bcryptjs.hash(verificationOtp, 10);

    // *** hash important data ***

    const hashedPassword = await bcryptjs.hash(password, 10);

    // *** create new buyer ***

    const newBuyer = new Buyer({
      name,
      email,
      password: hashedPassword,
      verificationOtp: hashedVerificationOtp,
      verificationOtpExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
    });

    // *** save buyer to database ***

    await newBuyer.save();

    // *** set jwt for future auth in response cookie ***

    const verificationToken = jwt.sign(
      { id: newBuyer._id, role: newBuyer.role },
      process.env.VERIFICATION_TOKEN_SECRET_KEY,
      {
        expiresIn: "1d",
      }
    );

    // *** send email with verification otp ***
    await sendEmail(
      process.env.SMTP_GMAIL_USER,
      email,
      "You OTP for email verification.",
      `Your OTP is ${verificationOtp}, Please verify your account!`
    );

    // *** send success response from API ***
    res
      .cookie("verificationToken", verificationToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      })
      .status(201)
      .json(
        new ApiResponse(
          null,
          "Registered successfully. OTP is sent to your email for verification."
        )
      );
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    // Clear the auth token cookie
    res
      .clearCookie("access_token", {
        httpOnly: true,
        secure: true,
        sameSite: "None",
      })
      .clearCookie("refresh_token", {
        httpOnly: true,
        secure: true,
        sameSite: "None",
      });
    res.status(200).json(new ApiResponse(null, "Logged out successfully."));
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // *** data validation (pending) ***
    if (!email || !password) {
      throw new ApiError(400, "All fields are required.");
    }

    // *** find buyer in the database ***

    const buyer = await Buyer.findOne({ email }).populate({
      path: "cart.product",
      select: "name price images",
    });

    if (!buyer) {
      throw new ApiError(401, "Invalid email address.");
    }

    // *** compare send password with the one in the db ***

    const isPasswordValid = await bcryptjs.compare(password, buyer.password);

    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid credentials.");
    }

    buyer.password = undefined; // removing password from respomse

    if (buyer.isVerified === true) {
      const access_token = jwt.sign(
        { id: buyer._id, role: buyer.role },
        process.env.ACCESS_TOKEN_SECRET_KEY,
        { expiresIn: "1d" }
      );

      const refresh_token = jwt.sign(
        { id: buyer._id, role: buyer.role },
        process.env.REFRESH_TOKEN_SECRET_KEY,
        { expiresIn: "10d" }
      );

      return res
        .status(200)
        .cookie("access_token", access_token, {
          httpOnly: true,
          secure: true,
          sameSite: "None",
        })
        .cookie("refresh_token", refresh_token, {
          httpOnly: true,
          secure: true,
          sameSite: "None",
        })
        .json(new ApiResponse(buyer, "Logged in successfully."));
    }

    // Handle unverified user
    if (buyer.isVerified === false) {
      const verificationOtp = genOtp();
      const hashedVerificationOtp = await bcryptjs.hash(verificationOtp, 10);

      await Buyer.findOneAndUpdate(
        { email },
        {
          $set: {
            verificationOtp: hashedVerificationOtp,
            verificationOtpExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
          },
        },
        {
          new: true,
        }
      );

      await sendEmail(
        process.env.SMTP_GMAIL_USER,
        email,
        "You OTP for email verification",
        `Your OTP is ${verificationOtp}, Please verify your account!`
      );

      const verificationToken = jwt.sign(
        { id: buyer._id, role: buyer.role },
        process.env.VERIFICATION_TOKEN_SECRET_KEY,
        {
          expiresIn: "1d",
        }
      );
      return res
        .cookie("verificationToken", verificationToken, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          maxAge: 24 * 60 * 60 * 1000, // 1 day
        })
        .status(400)
        .json({
          message: "Your account is not verified. Otp is sent to your email..",
        });
    }
  } catch (error) {
    next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    // *** validate input data (pending) ***
    if (!email) {
      throw new ApiError(400, "Email is required.");
    }
    // *** Make sure the email already exists ***

    const buyer = await Buyer.findOne({ email });

    if (!buyer) {
      throw new ApiError(400, "This email does'nt exists.");
    }

    // *** Generate reset password token and expiration time of reset password token ***

    const resetPasswordToken = crypto.randomBytes(20).toString("hex");

    const resetPasswordTokenExpiresAt = new Date(
      Date.now() + 1 * 60 * 60 * 1000
    );

    // *** update the reset password token and expiration of reset password token fields with the generated one

    buyer.resetPasswordToken = resetPasswordToken;
    buyer.resetPasswordTokenExpiresAt = resetPasswordTokenExpiresAt;

    // *** save the buyer to database

    await buyer.save();

    // *** set jwt for future auth in response cookie ***

    const resetPasswordVerificationToken = jwt.sign(
      { id: buyer._id, role: buyer.role },
      process.env.RESET_PASSWORD_TOKEN_SECRET_KEY,
      {
        expiresIn: "1d",
      }
    );

    // *** send email with link to reset password ***

    await sendEmailHtml(
      process.env.SMTP_GMAIL_USER,
      email,
      "Reset Your Password",
      `<h3>Reset Your password by clicking the link below</h3> <a href="${process.env.FRONTEND_DOMAIN_URL}/reset-password?resetPasswordToken=${resetPasswordToken}">reset password</a>`
    );

    return res
      .cookie(
        "resetPasswordVerificationToken",
        resetPasswordVerificationToken,
        {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          maxAge: 24 * 60 * 60 * 1000, // 1 day
        }
      )
      .status(200)
      .json(
        new ApiResponse(
          null,
          "Reset password link sent to your email. Please check your inbox."
        )
      );
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    // *** check for reset password token ***
    const resetPasswordVerificationToken =
      req.cookies.resetPasswordVerificationToken;

    if (!resetPasswordVerificationToken) {
      throw new ApiError(400, "Reset password verification token not found.");
    }

    // *** Make sure the token is not expired or tampered with ***

    const decodedAuthToken = jwt.verify(
      resetPasswordVerificationToken,
      process.env.RESET_PASSWORD_TOKEN_SECRET_KEY
    );

    // *** get the resetPasswordToken passed in, id from jwt and new password from request body ***

    const { resetPasswordToken } = req.params;
    const id = decodedAuthToken.id;
    const { newPassword } = req.body;

    // *** find the buyer in the database ***

    const buyer = await Buyer.findOne({ _id: id });

    if (!buyer) {
      throw new ApiError(404, "User not found.");
    }

    // *** Make sure that the resetPasswordToken in db matches with the one send in url ***

    if (resetPasswordToken !== buyer.resetPasswordToken) {
      throw new ApiError(400, "Invalid reset password token.");
    }

    // *** Make sure resetPasswordToken is not expired ***

    if (Date.now() > buyer.resetPasswordTokenExpiresAt) {
      throw new ApiError(401, "Reset password token expired.");
    }

    //  *** reset the password and save buyer to db ***

    buyer.password = await bcryptjs.hash(newPassword, 10);
    buyer.resetPasswordToken = null;
    buyer.resetPasswordTokenExpiresAt = null;

    await buyer.save();

    // *** send reset password email ***

    await sendEmail(
      process.env.SMTP_GMAIL_USER,
      buyer.email,
      "Password Reset Successful",
      "Your password was successfully reset"
    );

    return res
      .status(200)
      .json(new ApiResponse(null, "Password reset successfully"));
  } catch (error) {
    next(error);
  }
}

async function googleAuth(req, res, next) {
  try {
    const { googleIdToken } = req.body;

    const client = new OAuth2Client(process.env.GOOGLEAUTH_CLIENTID);

    // verify google token
    const ticket = await client.verifyIdToken({
      idToken: googleIdToken,
      audience: process.env.GOOGLEAUTH_CLIENTID,
    });

    // Get user info from Google
    const { name, email } = ticket.getPayload();

    let buyer = await Buyer.findOne({ email });

    // if user is not registered save the user in db and directly login the user to website
    if (!buyer) {
      // Password hashing
      const hashedPassword = bcryptjs.hash(
        Math.random().toString(36).slice(-8),
        12
      );

      buyer = new Buyer({
        name,
        email,
        password: hashedPassword,
      });

      // Update user verification status
      buyer.verificationOtp = null;
      buyer.isVerified = true;

      //  save the user in db
      await buyer.save();
    }

    const access_token = jwt.sign(
      { id: buyer._id, role: buyer.role },
      process.env.ACCESS_TOKEN_SECRET_KEY,
      { expiresIn: "1d" }
    );

    const refresh_token = jwt.sign(
      { id: buyer._id, role: buyer.role },
      process.env.REFRESH_TOKEN_SECRET_KEY,
      { expiresIn: "10d" }
    );

    buyer.password = undefined;

    return res
      .status(200)
      .cookie("access_token", access_token, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
      })
      .cookie("refresh_token", refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
      })

      .json(new ApiResponse(buyer, "Google Signed in successfully"));
  } catch (error) {
    next(error);
  }
}

export {
  register,
  login,
  logout,
  googleAuth,
  verifyEmail,
  forgotPassword,
  resetPassword,
};
