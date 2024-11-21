import { Product } from "../models/product.model.js";
import { Review } from "../models/review.model.js";
import { User } from "../models/user.model.js";

async function addReview(req, res, next) {
  try {
    const { productId } = req.params;
    const userId = req.user._id;
    const { rating, comment } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "Unauthorized access, please login",
      });
    }
    if (!productId) {
      return res.status(400).json({
        message: "product id is required",
      });
    }

    if (!rating) {
      return res.status(400).json({
        message: "Rating is required",
      });
    }

    const userExists = await User.findById(userId);

    if (!userExists) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    const productExists = await Product.findById(productId);

    if (!productExists) {
      return res.status(400).json({
        message: "Product not found",
      });
    }
    // Check if the user has already reviewed the product
    const existingReview = await Review.findOne({
      product: productId,
      user: userId,
    });

    if (existingReview) {
      return res.status(400).json({
        message: "You have already reviewed this product",
      });
    }

    const review = new Review({
      product: productId,
      user: userId,
      rating,
      comment,
    });

    const savedReview = await review.save();

    if (!savedReview) {
      return res.status(400).json({
        message: "Error occur while reviewing product",
      });
    }

    productExists.reviews.push(savedReview._id); //push the reviewid to review field in the product
    productExists.numReviews += 1; // increase number of review by 1

    // product rating calculation
    productExists.rating =
      (productExists.rating * (productExists.numReviews - 1) + rating) /
      productExists.numReviews;

    await productExists.save(); // Save the updated product

    res.status(201).json({
      message: "Review added",
      review: savedReview,
    });
  } catch (error) {
    next(error);
  }
}

async function getReviews(req, res, next) {
  try {
    const reviews = await Review.find();

    res.status(200).json({
      message: "Reviews retrived successfully",
      reviews,
    });
  } catch (error) {}
}

async function deleteReview(req, res, next) {
  try {
    const { reviewId } = req.params;

    // Check if the user has already reviewed the product
    const existingReview = await Review.findByIdAndDelete(reviewId);
    if (!existingReview) {
      return res.status(400).json({
        message: "Review not found",
      });
    }

    const productExists = await Product.findById(existingReview.product);

    if (!productExists) {
      return res.status(400).json({
        message: "Cannot delete review product not found",
      });
    }

    productExists.reviews = productExists.reviews.filter(
      (review) => review.toString() !== reviewId
    ); //filter the review from db
    productExists.numReviews -= 1; // decrease number of review by 1
    // product rating re-calculation
    const reviews = await Review.find({ product: productExists._id });
    if (productExists.numReviews > 0) {
      productExists.rating =
        reviews.reduce((acc, item) => acc + item.rating, 0) /
        productExists.numReviews;
    } else {
      productExists.rating = 0; // Reset rating if no reviews remain
    }

    await productExists.save(); // Save the updated product

    res.status(201).json({
      message: "Review deleted",
    });
  } catch (error) {
    next(error);
  }
}

export { addReview, deleteReview, getReviews };
