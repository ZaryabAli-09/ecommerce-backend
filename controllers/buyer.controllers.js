import { Buyer } from "../models/buyer.models.js";
import bcryptjs from "bcryptjs";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import getBuyerCartItemsCount from "../utils/getBuyerCartItemsCount.js";

import mongoose from "mongoose";

import { Product } from "../models/product.model.js";

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

function getBuyerProfile(req, res) {
  const buyer = req.buyer;

  res.status(200).json({
    status: "success",
    message: "Profile fetched successfully",
    data: {
      id: buyer._id,
      name: buyer.name,
      email: buyer.email,
      phoneNumber: buyer.phoneNumber,
      country: buyer.address.country,
      province: buyer.address.province,
      city: buyer.address.city,
      remainingAddress: buyer.address.remainingAddress,
      notes: buyer.address.notes,
      cartItemsCount: getBuyerCartItemsCount(buyer.cart),
      wishlistItemsCount: buyer.wishlist.length,
    },
  });
}

async function updateBuyerProfile(req, res) {
  try {
    const buyer = req.buyer;

    const { name, phoneNumber, province, city, remainingAddress, notes } =
      req.body;

    buyer.name = name;
    buyer.phoneNumber = phoneNumber;
    buyer.address.province = province;
    buyer.address.city = city;
    buyer.address.remainingAddress = remainingAddress;
    buyer.address.notes = notes;

    await buyer.save();

    return res.status(200).json(
      new ApiResponse(
        {
          name: buyer.name,
          email: buyer.email,
          phoneNumber: buyer.phoneNumber,
          country: buyer.address.country,
          province: buyer.address.province,
          city: buyer.address.city,
          remainingAddress: buyer.address.remainingAddress,
          notes: buyer.address.notes,
          cartItemsCount: getBuyerCartItemsCount(buyer.cart),
          wishlistItemsCount: buyer.wishlist.length,
        },

        "Profile updated successfully."
      )
    );
  } catch (error) {}
}

// Added by Talha below for buyer side application

async function addToBuyerBrowsingHistory(req, res) {
  const buyer = req.buyer;

  if (!buyer) {
    throw new ApiError(404, "Buyer not found.");
  }

  const productId = req.body.productId;

  if (!productId) {
    throw new ApiError(404, "Product Id not found.");
  }

  const product = await Product.findOne({ _id: productId });

  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  const browsingHistory = buyer.browsingHistory;

  if (browsingHistory.includes(productId)) {
    browsingHistory.splice(browsingHistory.indexOf(productId), 1);
  }

  browsingHistory.push(new mongoose.Types.ObjectId(productId));

  await buyer.save();

  res.status(200).json({
    status: "success",
    message: "Product added to browsing history successfully.",
    data: null,
  });
}

async function deleteFromBuyerBrowsingHistory(req, res) {
  const buyer = req.buyer;

  if (!buyer) {
    throw new ApiError(404, "Buyer not found.");
  }

  const productId = req.body.productId;

  if (!productId) {
    throw new ApiError(404, "Product Id not found.");
  }

  const product = await Product.findOne({ _id: productId });

  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  const browsingHistory = buyer.browsingHistory;

  if (browsingHistory.includes(productId)) {
    browsingHistory.splice(browsingHistory.indexOf(productId), 1);
  }

  await buyer.save();

  const populatedBuyer = await buyer.populate({
    path: "browsingHistory",
    select: "name numReviews rating variants", // only these fields will be included
  });

  res.status(200).json({
    status: "success",
    message: "Product removed from browsing history successfully.",
    data: populatedBuyer.browsingHistory,
  });
}

async function getBuyerBrowsingHistory(req, res) {
  const buyer = req.buyer;

  if (!buyer) {
    throw new ApiError(404, "Buyer not found.");
  }

  const populatedBuyer = await buyer.populate({
    path: "browsingHistory",
    select: "name numReviews rating variants", // only these fields will be included
  });

  res.status(200).json({
    status: "success",
    message: "Product added to browsing history successfully.",
    data: populatedBuyer.browsingHistory,
  });
}

export {
  getAllBuyers,
  getSingleBuyer,
  updateBuyer,
  deleteBuyer,
  getBuyerProfile,
  updateBuyerProfile,
  addToBuyerBrowsingHistory,
  getBuyerBrowsingHistory,
  deleteFromBuyerBrowsingHistory,
};
