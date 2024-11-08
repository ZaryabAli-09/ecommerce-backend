import { User } from "../models/user.model.js";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { transporter } from "../utils/mailer.js";

async function verifyEmail(req, res, next) {
  try {
    // get verification token from query as we put the verification token in query in register route
    const { verificationToken } = req.query;

    if (!verificationToken) {
      return res.status(404).json({ message: "Verification token not found" });
    }

    // verify the token get from verification link
    const decodedVerificationToken = jwt.verify(
      verificationToken,
      process.env.VERIFICATION_TOKEN_SECRET_KEY
    );

    if (!decodedVerificationToken) {
      return res.status(400).json({
        message: "Invalid token",
      });
    }

    //optional chaining for safety
    const email = decodedVerificationToken?.email;

    // finding user with help of email get from verification link token
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User is already verified" });
    }

    if (user.verificationToken !== verificationToken) {
      return res.status(400).json({
        message: "Invalid token",
      });
    }

    // Update user verification status
    user.verificationToken = null;
    user.isVerified = true;

    await user.save();
    res
      .status(200)
      .json({ message: "Email verified, you can noew access your account" });
  } catch (error) {
    next(error);
  }
}

async function register(req, res, next) {
  try {
    // getting required fields data from body
    const { name, email, password } = req.body;

    // input validation
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // Check if user with provided email already exists
    const isUserAlreadyExists = await User.findOne({ email });
    if (isUserAlreadyExists) {
      return res.status(400).json({
        message: "Email already exists, please choose another.",
      });
    }

    // Password hashing
    const hashedPassword = bcryptjs.hashSync(password, 12);

    // Verification token generation
    const verificationToken = jwt.sign(
      { email },
      process.env.VERIFICATION_TOKEN_SECRET_KEY,
      { expiresIn: "30m" }
    );

    const userToBeRegistered = new User({
      name,
      email,
      password: hashedPassword,
      verificationToken,
    });

    await userToBeRegistered.save();

    // Remove password from the response
    userToBeRegistered.password = undefined;

    // generating verification link
    const verificationLink = `${process.env.BACKEND_DOMAIN_URL}/api/auth/verify-email?verificationToken=${verificationToken}`;

    // Mail options
    const mailOptions = {
      from: process.env.SMTP_GMAIL_USER,
      to: email,
      subject: "Account Verification",
      text: `Please verify you email by clicking the following link:${verificationLink}`,
    };

    // Send verification email
    await transporter.sendMail(mailOptions);

    return res.status(201).json({
      user: userToBeRegistered,
      message: "User successfully registered, verification email sent",
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const userExists = await User.findOne({ email });

    if (!userExists) {
      return res.status(404).json({
        message: "User not found with this email please register",
      });
    }

    const isPasswordCorrect = bcryptjs.compareSync(
      password,
      userExists.password
    );

    if (!isPasswordCorrect) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    userExists.password = undefined;

    if (userExists.isVerified === true) {
      const access_token = jwt.sign(
        { _id: userExists._id },
        process.env.ACCESS_TOKEN_SECRET_KEY,
        { expiresIn: "1d" }
      );

      return res
        .status(200)
        .cookie("access_token", access_token, {
          httpOnly: true,
          secure: true,
          sameSite: "None",
        })
        .json({
          user: userExists,
          message: "Logged in successfully",
        });
    }

    // Handle unverified user
    if (userExists.isVerified === false) {
      const newVerificationToken = jwt.sign(
        { email },
        process.env.VERIFICATION_TOKEN_SECRET_KEY,
        { expiresIn: "30m" }
      );

      const user = await User.findOneAndUpdate(
        { email },
        {
          $set: {
            verificationToken: newVerificationToken,
          },
        },
        {
          new: true,
        }
      );

      // generating verification link
      const verificationLink = `${process.env.BACKEND_DOMAIN_URL}/api/auth/verify-email?verificationToken=${user.verificationToken}`;

      const mailOptions = {
        from: process.env.SMTP_GMAIL_USER,
        to: email,
        subject: "Account Verification",
        text: `Please verify you email by clicking the following link:${verificationLink}`,
      };

      await transporter.sendMail(mailOptions);

      return res.status(400).json({
        message:
          "Your account is not verified. Please check your email for a verification link.",
      });
    }
  } catch (error) {
    next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    console.log(email);
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: "Email not exists, please register" });
    }

    // Generate reset Password token
    const resetToken = jwt.sign(
      { email: user.email },
      process.env.RESET_PASSWORD_TOKEN_SECRET_KEY,
      { expiresIn: "30m" } // Token expires in 30 minutes
    );

    // save reset password token in database later matching the token when user reseting password
    user.resetPasswordToken = resetToken;

    // saving the user
    await user.save();

    // Create password reset link
    const resetLink = `${process.env.FRONTEND_DOMAIN_URL}/reset-password?resetPasswordToken=${resetToken}`;

    // Send email with reset link
    const mailOptions = {
      from: process.env.SMTP_GMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      text: `You requested a password reset. Click the following link to reset your password: ${resetLink}`,
    };

    // sending the password reset link to user email
    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      message: "Password reset email sent. Please check your inbox.",
    });
  } catch (error) {
    next(error);
  }
}
async function resetPassword(req, res, next) {
  try {
    const { resetPasswordToken, newPassword } = req.body;

    if (!resetPasswordToken || !newPassword) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // Verify token and handle expired token case
    let decodedResetPasswordToken;
    try {
      decodedResetPasswordToken = jwt.verify(
        resetPasswordToken,
        process.env.RESET_PASSWORD_TOKEN_SECRET_KEY
      );
    } catch (error) {
      return res.status(400).json({ message: "Invalid token" });
    }

    const user = await User.findOne({
      email: decodedResetPasswordToken?.email,
    });

    if (!user || user.resetPasswordToken !== resetPasswordToken) {
      return res.status(400).json({ message: "Invalid token" });
    }

    const hashedPassword = bcryptjs.hashSync(newPassword, 12);

    user.password = hashedPassword;
    user.resetPasswordToken = null;

    await user.save();

    return res.status(200).json({
      message: "Your password has been successfully changed.",
    });
  } catch (error) {
    next(error);
  }
}

export { register, login, verifyEmail, forgotPassword, resetPassword };
