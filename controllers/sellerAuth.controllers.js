import { ApiError } from "../utils/apiError.js";
import { Seller } from "../models/seller.model.js";
import { ApiResponse } from "../utils/apiResponse.js";
import sendEmail from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcryptjs from "bcryptjs";
import genOtp from "../utils/genOtp.js";
import sendEmailHtml from "../utils/sendEmailHtml.js";

async function verifyEmail(req, res, next) {
  try {
    // *** Extract auth(verification token) jwt from req cookies ***

    const verificationToken = req.cookies.verificationToken;
    if (!verificationToken) {
      throw new ApiError(400, "Verification token not found.");
    }

    // *** Extract verification OTP send by user from request ***

    const { verificationOtp } = req.body;
    if (!verificationOtp) {
      throw new ApiError(404, "Otp not found.");
    }

    // *** verify the send auth jwt to make sure it is not tampered with ***

    const decodedVerificationToken = jwt.verify(
      verificationToken,
      process.env.VERIFICATION_TOKEN_SECRET_KEY
    );

    // *** Extract the id of seller from jwt and find the buyer in the db ***

    const sellerId = decodedVerificationToken.id;

    // Find seller
    const existingSeller = await Seller.findById(sellerId);
    if (!existingSeller) {
      throw new ApiError(404, "Seller not found.");
    }

    // Check if OTP is expired
    if (new Date() > existingSeller.verificationOtpExpiresAt) {
      throw new ApiError(400, "OTP has expired. Please request a new one.");
    }

    // Compare OTPs
    const isMatch = await bcryptjs.compare(
      verificationOtp,
      existingSeller.verificationOtp
    );
    if (!isMatch) {
      throw new ApiError(400, "Invalid OTP.");
    }

    existingSeller.isVerified = true;
    existingSeller.verificationOtp = null;
    existingSeller.verificationOtpExpiresAt = null;

    await existingSeller.save();

    res
      .status(200)
      .json(
        new ApiResponse(
          null,
          "Your email has been successfully verified. We will review your application within 7 business days. Will be notified through email."
        )
      );
  } catch (error) {
    next(error);
  }
}

async function register(req, res, next) {
  try {
    const {
      brandName,
      brandDescription,
      email,
      contactNumber,
      businessAddress,
    } = req.body;

    // the data validation is done through joi in this controller

    // *** check if email alreay exists in db ***

    const existingSeller = await Seller.findOne({ email });
    if (existingSeller) {
      throw new ApiError(400, "Email already exists. Please choose another.");
    }

    // *** Generate a random OTP of 6 digit ***
    const verificationOtp = genOtp();

    // *** hashing otp ***

    const hashedVerificationOtp = await bcryptjs.hash(verificationOtp, 12);

    // Create a new seller in the database
    const newSeller = new Seller({
      brandName,
      brandDescription,
      email,
      contactNumber,
      businessAddress,
      verificationOtp: hashedVerificationOtp, // Store hashed OTP temporarily for email verification
      verificationOtpExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
    });

    // saving seller in db

    newSeller.save();

    // *** set jwt for future auth in response cookie ***

    const verificationToken = jwt.sign(
      { id: newSeller._id, role: newSeller.role },
      process.env.VERIFICATION_TOKEN_SECRET_KEY,
      {
        expiresIn: "1d",
      }
    );

    await sendEmail(
      process.env.SMTP_GMAIL_USER,
      email,
      "You OTP for email verification",
      `Your OTP is ${verificationOtp}, Please verify your account!`
    );

    res
      .cookie("verificationToken", verificationToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      })
      .status(201)
      .json(new ApiResponse(null, "OTP sent to your email for verification."));
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // soon will be changed/convert to joi validation
    if (!email || !password) {
      throw new ApiError(400, "All fields are required.");
    }

    const existingSeller = await Seller.findOne({ email });

    if (!existingSeller) {
      throw new ApiError(400, "Invalid email address.");
    }

    const isPasswordCorrect = await bcryptjs.compare(
      password,
      existingSeller.password
    );

    if (!isPasswordCorrect) {
      throw new ApiError(400, "Invalid credentials.");
    }

    const access_token = jwt.sign(
      { id: existingSeller._id, role: existingSeller.role },
      process.env.SELLER_ACCESS_TOKEN_SECRET_KEY,
      { expiresIn: "1d" }
    );

    const refresh_token = jwt.sign(
      { id: existingSeller._id, role: existingSeller.role },
      process.env.SELLER_REFRESH_TOKEN_SECRET_KEY,
      { expiresIn: "10d" }
    );

    // removing password from response
    existingSeller.password = undefined;

    res
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
      .json(new ApiResponse(existingSeller, "Logged in successfully."));
  } catch (error) {
    next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    // validate required fields
    if (!email) {
      throw new ApiError(400, "Email is required.");
    }

    // Check if seller exists
    const existingSeller = await Seller.findOne({ email });
    if (!existingSeller) {
      throw new ApiError(404, "Seller with this email does not exists.");
    }

    // check if seller account is approved or not
    if (existingSeller.status !== "approved") {
      throw new ApiError(
        401,
        "Unauthorized Access Your seller account is not approved yet"
      );
    }
    // *** Generate reset password token and expiration time of reset password token ***

    const resetPasswordToken = crypto.randomBytes(20).toString("hex");

    const resetPasswordTokenExpiresAt = new Date(
      Date.now() + 1 * 60 * 60 * 1000
    );

    // *** update the reset password token and expiration of reset password token fields with the generated one

    existingSeller.resetPasswordToken = resetPasswordToken;
    existingSeller.resetPasswordTokenExpiresAt = resetPasswordTokenExpiresAt;

    // saving the user
    await existingSeller.save();

    // Generate reset Password token
    const resetPasswordVerificationToken = jwt.sign(
      { id: existingSeller.id, role: existingSeller.role },
      process.env.SELLER_RESET_PASSWORD_TOKEN_SECRET_KEY,
      { expiresIn: "30m" } // Token expires in 30 minutes
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
    const resetPasswordVerificationToken =
      req.cookies.resetPasswordVerificationToken;

    if (!resetPasswordVerificationToken) {
      throw new ApiError(400, "Reset password verification token not found.");
    }

    // *** Make sure the token is not expired or tampered with ***

    const decodedResetPasswordToken = jwt.verify(
      resetPasswordVerificationToken,
      process.env.SELLER_RESET_PASSWORD_TOKEN_SECRET_KEY
    );

    const { newPassword } = req.body;
    const { resetPasswordToken } = req.params;

    // validate required fields
    if (!resetPasswordToken || !newPassword) {
      throw new ApiError(400, "New password is required.");
    }

    const seller = await Seller.findOne({
      _id: decodedResetPasswordToken?.id,
    });

    // *** Make sure that the is approved by the admin ***

    if (seller?.status !== "approved") {
      throw new ApiError(401, "Your Seller Account is not approved yet.");
    }

    // *** Make sure that the resetPasswordToken in db matches with the one send in url ***

    if (resetPasswordToken !== seller.resetPasswordToken) {
      throw new ApiError(400, "Invalid reset password token.");
    }

    // *** Make sure resetPasswordToken is not expired ***

    if (Date.now() > seller.resetPasswordTokenExpiresAt) {
      throw new ApiError(401, "Reset password token expired.");
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 12);

    seller.password = hashedPassword;
    seller.resetPasswordToken = null;
    seller.resetPasswordTokenExpiresAt = null;

    await seller.save();

    res
      .status(200)
      .json(
        new ApiResponse(null, "Your password has been successfully changed.")
      );
  } catch (error) {
    next(error);
  }
}

async function resendOtp(req, res, next) {
  try {
    // We expect the sellerId in the verificationToken that is set in the registeration controller

    const verificationToken = req.cookies.verificationToken;

    const verificationTokenDecoded = jwt.verify(
      verificationToken,
      process.env.VERIFICATION_TOKEN_SECRET_KEY
    );

    const sellerId = verificationTokenDecoded.id;

    // Validate sellerId
    if (!sellerId) {
      throw new ApiError(400, "Seller ID is required.");
    }

    // Find the seller by sellerId
    const existingSeller = await Seller.findById(sellerId);
    if (!existingSeller) {
      throw new ApiError(404, "Seller not found.");
    }

    // Check if the seller is already verified
    if (existingSeller.isVerified) {
      throw new ApiError(400, "Seller is already verified.");
    }

    // Get the email from the seller data
    const email = existingSeller.email;

    // Generate a new OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcryptjs.hash(otp, 12);
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    // Update OTP and expiration in the database
    existingSeller.verificationOtp = hashedOtp;
    existingSeller.verificationOtpExpiresAt = otpExpiry;

    await existingSeller.save();

    // Send the new OTP to the email

    console.log(email, process.env.SMTP_GMAIL_USER);

    await sendEmail(
      process.env.SMTP_GMAIL_USER,
      email,
      "Resend OTP",
      `Please use the following OTP to verify your email address: ${otp}`
    );

    res.status(200).json({
      message:
        "A new OTP has been sent to your email address. Please verify within 2 minutes.",
    });
  } catch (error) {
    next(error);
  }
}
async function logout(req, res, next) {
  try {
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
      })
      .status(200)
      .json(new ApiResponse(null, "Logged out successfully."));
  } catch (error) {
    next(error);
  }
}

async function approveSeller(req, res, next) {
  try {
    const { sellerId } = req.params;

    console.log(sellerId);
    // Find the seller
    const seller = await Seller.findById(sellerId);
    if (!seller) {
      throw new ApiError(404, "Seller not found");
    }

    if (seller.status !== "pending") {
      throw new ApiError(400, "Seller is not in pending status");
    }

    // Generate a random password
    const generatedPassword = crypto.randomBytes(6).toString("hex"); // Generates a 12-character password

    // Hash the password
    const hashedPassword = await bcryptjs.hash(generatedPassword, 12);

    // Update seller status and set password
    seller.status = "approved";
    seller.password = hashedPassword;
    seller.isVerified = true;
    await seller.save();

    // Send email with credentials
    const emailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a5568;">Your Seller Account Has Been Approved!</h2>
        <p style="color: #4a5568;">Hello ${seller.brandName},</p>
        <p style="color: #4a5568;">We're excited to inform you that your seller account has been approved. You can now log in to your seller dashboard and start managing your products.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Email:</strong> ${seller.email}</p>
          <p style="margin: 5px 0;"><strong>Temporary Password:</strong> ${generatedPassword}</p>
        </div>
        
        <p style="color: #4a5568;">For security reasons, we recommend changing your password after logging in.</p>
        <a href="${process.env.SELLER_FRONTEND_LOGIN_DOMAIN_URL}" style="display: inline-block; background-color: #4299e1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px;">Go to Seller Dashboard</a>
        
        <p style="color: #4a5568; margin-top: 20px;">Best regards,<br>The Admin Team</p>
      </div>
    `;

    await sendEmailHtml(
      process.env.SMTP_GMAIL_USER,
      seller.email,
      "Your Seller Account Has Been Approved",
      emailTemplate
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          null,
          "Seller approved successfully. Credentials sent to seller's email."
        )
      );
  } catch (error) {
    next(error);
  }
}

async function rejectSeller(req, res, next) {
  try {
    const { sellerId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      throw new ApiError(400, "Rejection reason is required");
    }

    const seller = await Seller.findById(sellerId);
    if (!seller) {
      throw new ApiError(404, "Seller not found");
    }

    if (seller.status !== "pending") {
      throw new ApiError(400, "Seller is not in pending status");
    }

    // Store seller email before deletion
    const sellerEmail = seller.email;
    const brandName = seller.brandName;

    // Remove seller from database
    await Seller.findByIdAndDelete(sellerId);

    // Send rejection email
    const rejectionTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a5568;">Your Seller Account Application</h2>
        <p style="color: #4a5568;">Hello ${brandName},</p>
        <p style="color: #4a5568;">We regret to inform you that your seller account application has been rejected and your account has been removed from our system.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Reason:</strong> ${reason}</p>
        </div>
        
        <p style="color: #4a5568;">
          If you believe this decision was made in error or would like to reapply, 
          please contact our support team at ${process.env.SUPPORT_NUMBER} before 
          registering again as a seller.
        </p>
        
        <p style="color: #4a5568; margin-top: 20px;">Best regards,<br>The Admin Team</p>
      </div>
    `;

    await sendEmailHtml(
      process.env.SMTP_FROM_EMAIL,
      sellerEmail,
      "Your Seller Account Application Status",
      rejectionTemplate
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          null,
          "Seller rejected and removed successfully. Notification sent to seller."
        )
      );
  } catch (error) {
    next(error);
  }
}

export {
  register,
  login,
  verifyEmail,
  resendOtp,
  forgotPassword,
  resetPassword,
  logout,
  approveSeller,
  rejectSeller,
};
