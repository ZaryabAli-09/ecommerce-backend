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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h1 style="color: #2d3748;">${process.env.PLATFORM_NAME}</h1>
          <h2 style="color: #4a5568;">Support Request Received</h2>
        <p style="color: #4a5568;">Hello ,</p>
          <p style="color: #4a5568;">Thank you for reaching out to us. We have received your support request regarding:</p>

           <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Subject:</strong> ${subject}</p>
          <p style="margin: 5px 0;"><strong>message:</strong> ${message}</p>
          <p style="margin: 5px 0;"><strong>Current Status:</strong> ${dispute.status}</p>

        </div>
          <p style="color: #4a5568;">We are currently reviewing your request and will get back to you shortly.</p>
          <br />
        <p style="color: #4a5568; margin-top: 20px;">Best regards,<br>${process.env.PLATFORM_NAME} Support Team </p>
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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h1 style="color: #2d3748;">${process.env.PLATFORM_NAME}</h1>
          <p style="color: #4a5568;">A new support/dispute request has been submitted. Here are the details:</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;"
             <p style="margin: 5px 0;"><strong>Subject:</strong> ${fromType}</p>
             <p style="margin: 5px 0;"><strong>Subject:</strong> ${email}</p>
             <p style="margin: 5px 0;"><strong>Subject:</strong> ${subject}</p>
             <p style="margin: 5px 0;"><strong>message:</strong> ${message}</p>
             <p style="margin: 5px 0;"><strong>Current Status:</strong> ${dispute.status}</p>
        </div>
  <br />
          <p style="color: #4a5568;">Please review and repond.</p>
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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
       <h1 style="color: #2d3748;">${process.env.PLATFORM_NAME}</h1>
       <h2 style="color: #4a5568;">Dispute Status Updated</h2>
       <p style="color: #4a5568;">Hello ,</p>
       <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 5px 0;">Your dispute status has been updated to: <strong>${status}</strong>.</p>
      <p style="margin: 5px 0;"><strong>Dispute ID:</strong> ${disputeId}</p>
      <p style="margin: 5px 0;"><strong>Subject:</strong> ${dispute.subject}</p>
      <p style="margin: 5px 0;"><strong>Message:</strong> ${dispute.message}</p>

    </div>
      <p style="color: #4a5568;">Thank you for you patience.</p>
      <br />
    <p style="color: #4a5568; margin-top: 20px;">Best regards,<br>${process.env.PLATFORM_NAME} Support Team </p>
    </div>
  `;

    await sendEmailHtml(
      process.env.SMTP_GMAIL_USER,
      userOrSeller.email,
      "Dispute Status Update",
      emailTemplate
    );

    const adminNotificationTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
     <h1 style="color: #2d3748;">${process.env.PLATFORM_NAME}</h1>
     <h2 style="color: #4a5568;">Dispute Status Updated</h2>
     <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <p style="margin: 5px 0;">A dispute has been updated by support team: <strong>${status}</strong>.</p>
 <p style="margin: 5px 0;"><strong>Dispute ID:</strong> ${disputeId}</p>
      <p style="margin: 5px 0;"><strong>Subject:</strong> ${dispute.subject}</p>
      <p style="margin: 5px 0;"><strong>Message:</strong> ${dispute.message}</p>
      <p>Please review if necessary.</p>
      <br/>
  </div>
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
