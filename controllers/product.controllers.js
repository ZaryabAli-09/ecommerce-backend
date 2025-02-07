import { Product } from "../models/product.model.js";
import { uploadToCloudinary } from "../config/cloudinary.config.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";

// Get the directory name from the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createProduct(req, res, next) {
  const sellerId = req.seller._id;

  try {
    let { name, description, categories, variants } = req.body;

    // validation of body fields
    if (
      !name ||
      !description ||
      !categories ||
      !variants ||
      variants.length === 0
    ) {
      throw new ApiError(400, "All product fields are required.");
    }

    variants = variants.map((variant) => ({
      ...variant,
      discountedPrice:
        variant.discountedPrice === "null" ? null : variant.discountedPrice,
    }));

    // check if product with same name is already in db
    const existingProduct = await Product.findOne({ name, seller: sellerId });

    // if product is already present in db then delete the images that is on our server uploaded by seller
    if (existingProduct) {
      Object.values(req.files || {}).forEach((files) => {
        if (Array.isArray(files)) {
          files.forEach((file) => {
            const filePath = path.join(__dirname, "../public", file.filename);
            fs.unlink(filePath, (err) => {
              if (err)
                console.error(`Failed to delete image: ${filePath}`, err);
            });
          });
        } else {
          const filePath = path.join(__dirname, "../public", files.filename);
          fs.unlink(filePath, (err) => {
            if (err) console.error(`Failed to delete image: ${filePath}`, err);
          });
        }
      });

      // sending response if product already exists with same name and seller
      return res
        .status(400)
        .json(
          new ApiResponse(
            null,
            "Product with this name already exists for this seller."
          )
        );
    }

    // Upload images to Cloudinary and associate them with the correct variant
    const uploadedVariants = await Promise.all(
      variants.map(async (variant, index) => {
        // Filter files for this variant
        const variantFiles = req.files?.[`variants[${index}][images]`];

        // Ensure variantFiles is an array
        const localImagePaths = Array.isArray(variantFiles)
          ? variantFiles.map((file) => file.path)
          : variantFiles
          ? [variantFiles.path]
          : [];

        const uploadedImages =
          localImagePaths.length > 0
            ? await uploadToCloudinary(localImagePaths)
            : [];
        // If there's an error uploading images, delete them from the server
        if (localImagePaths.length > 0 && !uploadedImages) {
          variantFiles.forEach((file) => {
            const filePath = path.join(__dirname, "../public", file.filename);
            fs.unlink(filePath, (err) => {
              if (err)
                console.error(`Failed to delete image: ${filePath}`, err);
            });
          });
          throw new ApiError(400, "Error uploading images, please try again.");
        }

        // Assign Cloudinary URLs and public IDs to the variant
        return {
          ...variant,
          images: uploadedImages.map((image) => image.url),
          imagesPublicIds: uploadedImages.map((image) => image.public_id),
        };
      })
    );

    // Calculate total stock from variants
    const countInStock = variants.reduce(
      (acc, variant) => acc + Number(variant.stock || 0),
      0
    );

    // generating unique slug for product will be used in future for getting specific product
    const generateSlug = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-")
      .replace(/^-+|-+$/g, "");

    const newProduct = new Product({
      seller: sellerId,
      name,
      description,
      countInStock,
      categories,
      variants: uploadedVariants,

      slug: generateSlug,
    });

    // saving product in db
    await newProduct.save();

    // sending success response after product successfully created
    return res
      .status(201)
      .json(new ApiResponse(newProduct, "Product created successfully."));
  } catch (error) {
    Object.values(req.files || {}).forEach((files) => {
      if (Array.isArray(files)) {
        files.forEach((file) => {
          const filePath = path.join(__dirname, "../public", file.filename);
          fs.unlink(filePath, (err) => {
            if (err) console.error(`Failed to delete image: ${filePath}`, err);
          });
        });
      } else {
        const filePath = path.join(__dirname, "../public", files.filename);
        fs.unlink(filePath, (err) => {
          if (err) console.error(`Failed to delete image: ${filePath}`, err);
        });
      }
    });
    next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const { productId } = req.params;
    const sellerId = req.seller._id;

    const productExist = await Product.findOne({
      _id: productId,
      seller: sellerId,
    });

    if (!productExist) {
      throw new ApiError(
        404,
        "Product not found or you do not have permission to delete it."
      );
    }

    // Collect all the publicIds from each variant
    const allImagesPublicIds = productExist.variants.flatMap(
      (variant) => variant.imagesPublicIds
    );

    // Delete images from Cloudinary
    const deleteProductImages = allImagesPublicIds.map((publicId) => {
      return cloudinary.uploader.destroy(publicId);
    });

    await Promise.all(deleteProductImages);

    if (!deleteProductImages) {
      throw new ApiError(
        400,
        "Error occur while deleting product. Please try again."
      );
    }

    const productToBeDeleted = await Product.findByIdAndDelete(productId);

    res
      .status(200)
      .json(
        new ApiResponse(productToBeDeleted, "Product deleted successfully.")
      );
  } catch (error) {
    next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const { productId } = req.params;
    const sellerId = req.seller._id;

    // Ensure the productId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new ApiError(400, "Invalid product ID format.");
    }

    const productExist = await Product.findOne({
      _id: productId,
      seller: sellerId,
    });

    if (!productExist) {
      throw new ApiError(
        404,
        "Product not found or you do not have permission to delete it."
      );
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        ...req.body,
      },
      { new: true }
    );

    res
      .status(200)
      .json(new ApiResponse(updatedProduct, "Product updated successfully."));
  } catch (error) {
    next(error);
  }
}

async function getSellerProducts(req, res, next) {
  try {
    const sellerId = req.seller._id;
    const products = await Product.find({ seller: sellerId }).populate(
      "categories",
      "name"
    ); // Populate 'categories' and select only 'name

    res
      .status(200)
      .json(
        new ApiResponse(products, "Seller products retrived successfully.")
      );
  } catch (error) {
    S;
    next(error);
  }
}

async function getSingleProduct(req, res, next) {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId)
      .populate({
        path: "reviews",
        populate: {
          path: "user", // Populate the 'user' field in 'reviews'
          select: "name", // Select only the 'name' field from 'user'
        },
      })
      .populate("categories", "name"); // Populate 'categories' and select only 'name'
    res
      .status(200)
      .json(new ApiResponse(product, "Product retrieved successfully."));
  } catch (error) {
    next(error);
  }
}

async function getAllProducts(req, res, next) {
  try {
    const products = await Product.find().populate("reviews");

    res
      .status(200)
      .json(new ApiResponse(products, "All products retrieved successfully."));
  } catch (error) {
    next(error);
  }
}

export {
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getSellerProducts,
  getSingleProduct,
};
