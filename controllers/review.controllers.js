import { Product } from "../models/product.model.js";
import { Review } from "../models/review.model.js";
import { Buyer } from "../models/buyer.models.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

async function addReview(req, res, next) {
  try {
    const { productId } = req.params;
    const buyerId = req.buyer._id;
    const { rating, comment } = req.body;

    if (!buyerId) {
      throw new ApiError(400, "Unauthorized access, please login.");
    }
    if (!productId) {
      throw new ApiError(400, "Product ID is required");
    }
    if (!rating) {
      throw new ApiError(400, "Rating not found. Please add rating.");
    }

    const buyerExists = await Buyer.findById(buyerId);
    if (!buyerExists) {
      throw new ApiError(404, "User not found.");
    }

    const productExists = await Product.findById(productId);
    if (!productExists) {
      throw new ApiError(404, "Product not found.");
    }

    // Check if the buyer has already reviewed the product
    const existingReview = await Review.findOne({
      product: productId,
      user: buyerId, // Use buyerId as the user reference
    });
    if (existingReview) {
      throw new ApiError(400, "You have already reviewed this product.");
    }

    const review = new Review({
      product: productId,
      user: buyerId, // Updated field name
      rating,
      comment,
    });

    const savedReview = await review.save();
    if (!savedReview) {
      throw new ApiError(
        400,
        "Error occurred while reviewing product. Please try again."
      );
    }

    productExists.reviews.push(savedReview._id); // Push the review ID to the reviews field in the product
    productExists.numReviews += 1; // Increment the number of reviews

    // Recalculate product rating
    productExists.rating =
      (productExists.rating * (productExists.numReviews - 1) + rating) /
      productExists.numReviews;

    await productExists.save(); // Save the updated product

    res.status(201).json(new ApiResponse(savedReview, "Review added."));
  } catch (error) {
    next(error);
  }
}

async function deleteReview(req, res, next) {
  try {
    const { reviewId } = req.params;

    const existingReview = await Review.findByIdAndDelete(reviewId);
    if (!existingReview) {
      throw new ApiError(404, "Review not found.");
    }

    const productExists = await Product.findById(existingReview.product);
    if (!productExists) {
      throw new ApiError(
        404,
        "Error occur while deleting review. Product not found."
      );
    }

    productExists.reviews = productExists.reviews.filter(
      (review) => review.toString() !== reviewId
    ); // Remove the review ID from the reviews field
    productExists.numReviews -= 1; // Decrement the number of reviews

    // Recalculate product rating
    const reviews = await Review.find({ product: productExists._id });
    if (productExists.numReviews > 0) {
      productExists.rating =
        reviews.reduce((acc, item) => acc + item.rating, 0) /
        productExists.numReviews;
    } else {
      productExists.rating = 0; // Reset rating if no reviews remain
    }

    await productExists.save(); // Save the updated product

    res.status(201).json(new ApiResponse(null, "Review deleted successfully."));
  } catch (error) {
    next(error);
  }
}

const getAllReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, replyStatus, dateFilter } = req.query;

    // Base query - exclude reviews with deleted products
    const query = {
      product: { $exists: true, $ne: null },
    };

    // Filter by reply status
    if (replyStatus === "replied") {
      query["sellerReply.text"] = { $exists: true, $ne: null };
    } else if (replyStatus === "not replied") {
      query["sellerReply.text"] = null;
    }
    // Date filtering - using immutable dates
    if (dateFilter) {
      const now = new Date();
      let startDate, endDate;

      switch (dateFilter) {
        case "thisWeek":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - now.getDay());
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          break;
        case "thisMonth":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case "lastMonth":
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
      }

      if (startDate && endDate) {
        query.createdAt = {
          $gte: startDate,
          $lte: endDate,
        };
      }
    }

    // Get total count (including product existence check)
    const total = await Review.countDocuments(query);

    // Get paginated results
    const reviews = await Review.find(query)
      .populate({
        path: "product",
        select: "name images",
        match: { _id: { $exists: true } }, // Ensure product exists
      })
      .populate({
        path: "product.seller",
        select: "brandName",
      })
      .populate("user", "name")
      .sort({ createdAt: -1 }) // Newest first
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .exec();

    // Additional filtering just in case
    const filteredReviews = reviews.filter(
      (review) => review.product && review.product._id
    );

    return res.status(200).json(
      new ApiResponse(
        {
          data: filteredReviews,
          total,
        },
        "Reviews fetched successfully."
      )
    );
  } catch (error) {
    next(error);
  }
};
const getSellerReviews = async (req, res, next) => {
  try {
    const { sellerId } = req.params;
    const {
      page = 1, // Default page is 1
      limit = 10, // Default limit is 10
      replyStatus, // "replied", "not replied"
      dateFilter, // "thisWeek", "thisMonth", "lastMonth"
    } = req.query;

    console.log(req.query);
    // Base query to fetch reviews
    const query = {};

    // Filter by reply status
    if (replyStatus === "replied") {
      query["sellerReply.text"] = { $exists: true, $ne: null };
    } else if (replyStatus === "not replied") {
      query["sellerReply.text"] = { $exists: false };
    }

    // Date filtering logic
    if (dateFilter) {
      const currentDate = new Date();
      let startDate, endDate;

      switch (dateFilter) {
        case "thisWeek":
          startDate = new Date(
            currentDate.setDate(currentDate.getDate() - currentDate.getDay())
          );
          endDate = new Date(currentDate.setDate(currentDate.getDate() + 6));
          break;
        case "thisMonth":
          startDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            1
          );
          endDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            0
          );
          break;
        case "lastMonth":
          startDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            1
          );
          endDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            0
          );
          break;
        default:
          break;
      }

      if (startDate && endDate) {
        query.createdAt = { $gte: startDate, $lte: endDate };
      }
    }

    // Get the total count of reviews matching the query
    const total = await Review.countDocuments(query);

    // Pagination logic
    const skip = (page - 1) * limit;
    const reviews = await Review.find(query)
      .populate({
        path: "product",
        select: "name images seller", // Populate the product and its seller field
        match: { seller: sellerId }, // Ensure the product belongs to the seller
      })
      .populate("user", "name") // Populate the user field
      .skip(skip)
      .limit(Number(limit))
      .exec();

    // Filter out reviews where the product is null (due to the match condition)
    const filteredReviews = reviews.filter((review) => review.product !== null);

    if (filteredReviews.length === 0) {
      return res.status(200).json(new ApiResponse([], "No reviews found."));
    }

    return res.status(200).json(
      new ApiResponse(
        {
          data: filteredReviews,
          total,
        },
        "Reviews fetched successfully."
      )
    );
  } catch (error) {
    next(error);
  }
};

async function sellerReplyToReview(req, res, next) {
  try {
    const { text } = req.body;
    const sellerId = req.seller._id; // Get seller ID from authentication
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);

    // Check if the seller owns the product being reviewed
    const product = await Product.findById(review.product);
    if (product.seller.toString() !== sellerId.toString()) {
      throw new ApiError(403, "Unauthorized access.");
    }

    if (!review) {
      throw new ApiError(404, "No review found.");
    }

    review.sellerReply = {
      text,
      seller: sellerId,
      replyDate: new Date(),
    };
    await review.save();

    res.status(201).json(new ApiResponse(null, "Replied successfully."));
  } catch (error) {
    next(error);
  }
}

export {
  addReview,
  deleteReview,
  getAllReviews,
  getSellerReviews,
  sellerReplyToReview,
};
