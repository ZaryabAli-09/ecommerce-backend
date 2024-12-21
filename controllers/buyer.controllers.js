import { Buyer } from "../models/buyer.models.js";
import bcryptjs from "bcryptjs";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

async function getAllBuyers(req, res, next) {
  try {
    const buyers = await Buyer.find();

    if (!buyers || buyers.length === 0) {
      throw new ApiError(404, "No buyers found.");
    }

    return res
      .status(200)
      .json(new ApiResponse(buyers, "All buyers retrived sucessfully."));
  } catch (error) {
    next(error);
  }
}

async function getSingleBuyer(req, res, next) {
  try {
    const { buyerId } = req.params;
    const buyer = await Buyer.findById(buyerId);

    if (!buyer) {
      throw new ApiError(404, "No buyer found.");
    }

    return res
      .status(200)
      .json(new ApiResponse(buyer, "Single buyer retrieved successfully"));
  } catch (error) {
    next(error);
  }
}

async function updateBuyer(req, res, next) {
  try {
    const { buyerId } = req.params;
    const { name, password, address, gender, interests } = req.body;

    // Update fields only if they are provided
    const updates = {};
    if (name) updates.name = name;
    if (password) {
      const hashedPassword = bcryptjs.hashSync(password, 12);
      updates.password = hashedPassword;
    }
    if (gender) updates.gender = gender;
    if (interests) updates.interests = interests;
    if (address) {
      updates.address = {};
      if (address.street) updates.address.street = address.street;
      if (address.city) updates.address.city = address.city;
      if (address.state) updates.address.state = address.state;
      if (address.postalCode) updates.address.postalCode = address.postalCode;
      if (address.country) updates.address.country = address.country;
    }

    const updatedBuyer = await Buyer.findByIdAndUpdate(
      buyerId,
      {
        $set: updates,
      },
      { new: true }
    );

    if (!updatedBuyer) {
      throw new ApiError(404, "Buyer not found.");
    }

    return res
      .status(200)
      .json(new ApiResponse(updatedBuyer, "Buyer updated successfully."));
  } catch (error) {
    next(error);
  }
}

async function deleteBuyer(req, res, next) {
  try {
    const { buyerId } = req.params;

    if (!buyerId) {
      throw new ApiError(400, "Buyer id is required.");
    }

    const buyerToBeDeleted = await Buyer.findByIdAndDelete(buyerId);

    if (!buyerToBeDeleted) {
      throw new ApiError(404, "Buyer not found.");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          null,
          `Buyer ${buyerToBeDeleted.name} is successfully deleted`
        )
      );
  } catch (error) {
    next(error);
  }
}

export { getAllBuyers, getSingleBuyer, updateBuyer, deleteBuyer };
