import { Seller } from "../models/seller.model.js";
import bcryptjs from "bcryptjs";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import fs from "fs";
import { uploadSingleImageToCloudinary } from "../config/cloudinary.config.js";
import { v2 as cloudinary } from "cloudinary";
import { fileURLToPath } from "url";
import path from "path";

// Get the directory name from the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getAllSellers(req, res, next) {
  try {
    const sellers = await Seller.find();

    if (!sellers || sellers.length === 0) {
      throw new ApiError(404, "No sellers found.");
    }

    return res
      .status(200)
      .json(new ApiResponse(sellers, "All sellers retrieved successfully."));
  } catch (error) {
    next(error);
  }
}

async function getSingleSeller(req, res, next) {
  try {
    const { sellerId } = req.params;

    if (!sellerId) throw new ApiError(404, "Seller id not found.");

    const seller = await Seller.findById(sellerId);

    if (!seller) {
      throw new ApiError(404, "No seller found.");
    }

    return res
      .status(200)
      .json(new ApiResponse(seller, "Single seller retrieved successfully."));
  } catch (error) {
    next(error);
  }
}

async function updateSeller(req, res, next) {
  try {
    const { sellerId } = req.params;
    const {
      password,
      contactNumber,
      brandName,
      brandDescription,
      businessAddress,
      socialLinks,
      bankDetails,
    } = req.body;

    // Update fields only if they are provided
    const updates = {};
    if (password) {
      const hashedPassword = await bcryptjs.hash(password, 12);
      updates.password = hashedPassword;
    }
    if (contactNumber) updates.contactNumber = contactNumber;
    if (brandName) updates.brandName = brandName;
    if (brandDescription) updates.brandDescription = brandDescription;
    if (businessAddress) updates.businessAddress = businessAddress;

    // Validate and update socialLinks object fields if provided
    if (socialLinks) {
      updates.socialLinks = {};
      if (socialLinks.instagram)
        updates.socialLinks.instagram = socialLinks.instagram;
      if (socialLinks.facebook)
        updates.socialLinks.facebook = socialLinks.facebook;
      if (socialLinks.twitter)
        updates.socialLinks.twitter = socialLinks.twitter;
      if (socialLinks.linkedin)
        updates.socialLinks.linkedin = socialLinks.linkedin;
    }

    // Validate and update bankDetails object fields if provided
    if (bankDetails) {
      updates.bankDetails = {};
      if (bankDetails.bankName)
        updates.bankDetails.bankName = bankDetails.bankName;
      if (bankDetails.accountNumber)
        updates.bankDetails.accountNumber = bankDetails.accountNumber;
      if (bankDetails.accountHolderName)
        updates.bankDetails.accountHolderName = bankDetails.accountHolderName;
    }

    const updatedSeller = await Seller.findByIdAndUpdate(
      sellerId,
      {
        $set: updates,
      },
      { new: true }
    );

    if (!updatedSeller) {
      throw new ApiError(404, "Seller not found.");
    }

    return res
      .status(200)
      .json(new ApiResponse(updatedSeller, "Seller updated successfully."));
  } catch (error) {
    next(error);
  }
}

async function deleteSeller(req, res, next) {
  try {
    const { sellerId } = req.params;

    if (!sellerId) {
      throw new ApiError(400, "Seller ID is required.");
    }

    // Fetch seller first
    const sellerToBeDeleted = await Seller.findById(sellerId);
    if (!sellerToBeDeleted) {
      throw new ApiError(404, "Seller not found.");
    }

    const coverImagePublicId = sellerToBeDeleted?.coverImage?.public_id;
    const deleteCoverImage = await cloudinary.uploader.destroy(
      coverImagePublicId
    );
    if (!deleteCoverImage) {
      throw new ApiError(
        400,
        "Failed to delete cover image of seller. Please try again later."
      );
    }

    // Helper function to delete images from Cloudinary
    const deleteImage = async (publicId) => {
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    };

    // Delete cover image & logo if they exist
    await deleteImage(sellerToBeDeleted?.coverImage?.public_id);
    await deleteImage(sellerToBeDeleted?.logo?.public_id);

    // delete seller from DB
    await Seller.findByIdAndDelete(sellerId);

    return res
      .status(200)
      .json(
        new ApiResponse(
          null,
          `Seller ${sellerToBeDeleted.brandName} is successfully deleted.`
        )
      );
  } catch (error) {
    next(error);
  }
}

const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) throw new ApiError(400, "No file uploaded");

    // Upload to Cloudinary
    const uploadResult = await uploadSingleImageToCloudinary(req.file.path);
    if (!uploadResult) throw new ApiError(500, "Image upload failed");

    // Delete old image from Cloudinary if exists
    if (req.body.oldPublicId) {
      const deleteResult = await cloudinary.uploader.destroy(
        req.body.oldPublicId
      );

      if (deleteResult.result !== "ok") {
        throw new ApiError(500, "Failed to delete old image.");
      }
    }

    // Update seller
    const updatedSeller = await Seller.findByIdAndUpdate(
      req.seller._id,
      {
        [req.imageType]: {
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
        },
      },
      { new: true }
    );

    if (!updatedSeller) throw new ApiError(404, "Seller not found");

    res
      .status(200)
      .json(
        new ApiResponse(
          updatedSeller[req.imageType],
          `${req.imageType} updated successfully`
        )
      );
  } catch (error) {
    // Cleanup: Delete the local file if error occurs
    if (req.file?.filename) {
      const filePath = path.join(__dirname, "../public", req.file.filename);
      fs.unlink(filePath, (err) => {
        if (err)
          console.error(`Failed to delete Seller image: ${filePath}, err`);
      });
    }
    next(error);
  }
};

export {
  getAllSellers,
  getSingleSeller,
  updateSeller,
  deleteSeller,
  uploadImage,
};
