import mongoose from "mongoose";
import Dispute from "../models/support&disputes.models.js";
import sendEmailHtml from "../utils/sendEmailHtml.js"; // assuming you have an HTML version
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";

// 1. Create Dispute
export const createDispute = async (req, res, next) => {
  try {
    const { fromType, subject, message } = req.body;

    // Identify who is making the dispute (user or seller)
    const fromId = req.buyer?._id || req.seller?._id;
    const email = req.buyer?.email || req.seller?.email;

    if (!fromType || !subject || !message) {
      throw new ApiError(400, "All fields are required");
    }

    if (!fromId || !email) {
      throw new ApiError(401, "Unauthorized: User or Seller not identified");
    }

    const dispute = await Dispute.create({
      fromType, // should be "User" or "Seller"
      fromId,
      subject,
      message,
    });

    // Prepare Email
    const emailTemplate = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
          <h2 style="color: #4a5568;">Support Request Received</h2>
          <p>Hello,</p>
          <p>Thank you for reaching out to us. We have received your support request regarding:</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong> ${message}</p>
          <p><strong>Status:</strong> ${dispute.status}</p>
          <p>Our support team will get back to you as soon as possible.</p>
          <br />
          <p style="color: #718096;">Best Regards,<br/>Support Team</p>
        </div>
      `;

    await sendEmailHtml(
      process.env.SMTP_GMAIL_USER,
      email,
      "Support Request Received",
      emailTemplate
    );

    // Prepare Email for the Admin
    const emailTemplateForAdmin = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
  <h2 style="color: #4a5568;">New Support Request Submitted</h2>
  <p>A new support/dispute request has been submitted. Here are the details:</p>
  <p><strong>Submitted By:</strong> ${fromType}</p>
  <p><strong>Email:</strong> ${email}</p>
  <p><strong>Subject:</strong> ${subject}</p>
  <p><strong>Message:</strong> ${message}</p>
  <p><strong>Current Status:</strong> ${dispute.status}</p>
  <br />
  <p style="color: #718096;">Please review and respond promptly.</p>
</div>
`;

    await sendEmailHtml(
      process.env.SMTP_GMAIL_USER,
      process.env.SMTP_GMAIL_USER,
      "Support Request Received",
      emailTemplateForAdmin
    );

    return res
      .status(201)
      .json(
        new ApiResponse(
          dispute,
          "Request submitted successfully. You will be notified through your email thanks."
        )
      );
  } catch (error) {
    next(error);
  }
};

// 2. Get All Disputes (Admin)
export const getAllDisputes = async (req, res, next) => {
  try {
    const disputes = await Dispute.find()
      .populate("fromId", "email name brandName") // populate user or seller
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json(new ApiResponse(disputes, "Disputes fetched successfully"));
  } catch (error) {
    next(error);
  }
};

// 3. Update Dispute Status
export const updateDisputeStatus = async (req, res, next) => {
  try {
    const { disputeId } = req.params;
    const { status } = req.body;

    if (!["pending", "resolved"].includes(status)) {
      throw new ApiError(400, "Invalid status value");
    }

    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      throw new ApiError(404, "Dispute not found");
    }

    dispute.status = status;
    await dispute.save();

    // Fetch user/seller info to send email
    const userOrSeller = await mongoose
      .model(dispute.fromType)
      .findById(dispute.fromId);

    if (!userOrSeller) {
      throw new ApiError(404, "User/Seller not found");
    }

    // Email template
    const emailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h2 style="color: #4a5568;">Dispute Status Updated</h2>
        <p>Hello,</p>
        <p>Your dispute status has been updated to: <strong>${status}</strong>.</p>
        <p>Thank you for your patience.</p>
      </div>
    `;

    await sendEmailHtml(
      process.env.SMTP_GMAIL_USER,
      userOrSeller.email,
      "Dispute Status Update",
      emailTemplate
    );
    const adminNotificationTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
      <h2 style="color: #4a5568;">Dispute Status Updated</h2>
      <p>A dispute status has been updated by an admin.</p>
      <p><strong>Updated Status:</strong> ${status}</p>
      <p><strong>Dispute ID:</strong> ${disputeId}</p>
      <p>Please review if necessary.</p>
      <br/>
      <p style="color: #718096;">System Notification</p>
    </div>
  `;
    await sendEmailHtml(
      process.env.SMTP_GMAIL_USER,
      process.env.SMTP_GMAIL_USER,
      "Dispute Status Updated",
      adminNotificationTemplate
    );

    return res
      .status(200)
      .json(new ApiResponse(dispute, "Dispute status updated successfully"));
  } catch (error) {
    next(error);
  }
};
