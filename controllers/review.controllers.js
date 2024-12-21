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

async function getReviews(req, res, next) {
  try {
    const reviews = await Review.find();

    res
      .status(200)
      .json(new ApiResponse(reviews, "Reviews retrieved successfully."));
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

export { addReview, deleteReview, getReviews };
