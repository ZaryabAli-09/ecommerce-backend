import { Category, Product } from "../models/product.model.js";
import { uploadToCloudinary } from "../config/cloudinary.config.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";
import { User } from "../models/user.model.js";
import { Review } from "../models/product.model.js";

// Get the directory name from the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createProduct(req, res, next) {
  try {
    let {
      name,
      description,
      price,
      discountedPrice,
      images,
      categories,
      isVariable,
      countInStock,
      variants,
    } = req.body;

    if (!name || !description || !price || !categories) {
      return res.status(400).json({
        message: "All product fields are required",
      });
    }

    if (!req.files) {
      return res.status(400).json({
        message: "Please upload images",
      });
    }

    const existingProduct = await Product.findOne({ name });

    if (existingProduct) {
      req.files.forEach((file) => {
        const filePath = path.join(__dirname, "../public", file.filename); // Adjust the path if necessary
        fs.unlink(filePath, (err) => {
          if (err) console.error(`Failed to delete image: ${filePath}`, err);
        });
      });
      return res.status(400).json({
        message: "Product with name is already exists",
      });
    }
    if (isVariable) {
      if (variants?.length > 0) {
        const stocks = variants.reduce((acc, variant) => {
          const stockValue = Number(variant.stock);
          return acc + stockValue;
        }, 0);

        countInStock = stocks;
      }
    }
    const generateSlug = name
      .toLowerCase()
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/[^\w\-]+/g, "") // Remove all non-word characters
      .replace(/\-\-+/g, "-") // Replace multiple hyphens with a single hyphen
      .replace(/^-+|-+$/g, "");

    const localImagesPaths = req.files?.map((imageInfo) => {
      return imageInfo.path;
    });

    const imagesUploadedToCloudinary = await uploadToCloudinary(
      localImagesPaths
    );
    if (!imagesUploadedToCloudinary) {
      return res.status(400).json({
        message: "Error occur while uploading images please try again",
      });
    }
    const imagesUrls = imagesUploadedToCloudinary.map((image) => image.url);
    const imagesPublicids = imagesUploadedToCloudinary.map(
      (image) => image.public_id
    );

    console.log(imagesUrls);
    console.log(imagesPublicids);

    const savedProduct = new Product({
      name,
      description,
      price,
      images,
      discountedPrice,
      countInStock,
      categories,
      isVariable,
      variants,
      images: imagesUrls,
      imagesPublicIds: imagesPublicids,
      slug: generateSlug,
    });

    await savedProduct.save();

    return res.status(201).json({
      message: "Product created successfully",
      product: savedProduct,
    });
  } catch (error) {
    req.files.forEach((file) => {
      const filePath = path.join(__dirname, "../public", file.filename); // Adjust the path if necessary
      fs.unlink(filePath, (err) => {
        if (err) console.error(`Failed to delete image: ${filePath}`, err);
      });
    });
    next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const { productId } = req.params;

    const productExist = await Product.findById(productId);

    if (!productExist) {
      return res.status(404).json({
        message: "Product your are updating not found",
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        ...req.body,
      },
      {
        new: true,
      }
    );

    res.status(200).json({
      message: "Product updated successfully",
      updatedProduct,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const { productId } = req.params;

    const productExist = await Product.findById(productId);

    if (!productExist) {
      return res.status(404).json({
        message: "Product your are deleting not found",
      });
    }

    const imagesPublicIdArray = productExist.imagesPublicIds;

    const deleteProductImages = imagesPublicIdArray.map((publicId) => {
      return cloudinary.uploader.destroy(publicId);
    });

    const deletedImagesresult = await Promise.all(deleteProductImages);
    console.log(deletedImagesresult);

    const productToBeDeleted = await Product.findByIdAndDelete(productId);

    res.status(200).json({
      message: "Product deleted successfully",
      // urls,
      deletedProduct: productToBeDeleted,
    });
  } catch (error) {
    next(error);
  }
}

async function getAllProducts(req, res, next) {
  try {
    const products = await Product.find().populate("reviews");

    res.status(200).json({
      message: "All products retrieved successfully",
      productsLength: products.length,
      products: products,
    });
  } catch (error) {
    next(error);
  }
}

async function getSingleProduct(req, res, next) {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId).populate("reviews");

    res.status(200).json({
      message: "Product retrieved successfully",
      product: product,
    });
  } catch (error) {
    next(error);
  }
}

async function addReview(req, res, next) {
  try {
    const { userId, productId } = req.params;
    const { rating, comment } = req.body;
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

// ...........................................................
// ...........................................................
// ...........................................................
// categories functions/controllers

async function createCategories(req, res, next) {
  const { name, parent } = req.body;

  try {
    // Create the new category
    const newCategory = new Category({ name, parent });
    await newCategory.save();

    // If there's a parent, update the parent's subCategories using $push

    if (parent) {
      await Category.updateOne(
        { _id: parent },
        { $push: { subCategories: newCategory._id } },
        { new: true }
      );
    }

    return res.status(201).json({
      category: newCategory,
    });
  } catch (error) {
    next(error);
  }
}

async function getAllCategories(req, res, next) {
  try {
    const categories = await Category.find({ parent: null }).populate({
      path: "subCategories",
      populate: {
        path: "subCategories",
      },
    });

    res.status(200).json({
      categories: categories,
      message: "Successfully get all categories",
    });
  } catch (error) {
    next(error);
  }
}

export {
  createProduct,
  createCategories,
  getAllCategories,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getSingleProduct,
  addReview,
  deleteReview,
  getReviews,
};
