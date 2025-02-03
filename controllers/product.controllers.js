import { Product } from "../models/product.model.js";
import { uploadToCloudinary } from "../config/cloudinary.config.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

// Get the directory name from the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createProduct(req, res, next) {
  const sellerId = req.seller._id;

  try {
    let {
      name,
      description,
      price,
      discountedPrice,
      categories,
      isVariable,
      countInStock,
      variants,
    } = req.body;

    console.log(req.body);
    // validation of body fields
    if (!name || !description || !price || !categories) {
      throw new ApiError(400, "All product fields are required.");
    }

    if (discountedPrice === "null") {
      discountedPrice = null;
    }
    // check if images are present in request or not
    if (!req.files) {
      throw new ApiError(400, "Please upload image.");
    }

    // check if product with same name is already in db
    const existingProduct = await Product.findOne({ name, seller: sellerId });

    // if product is already present in db then delete the images that is on our server uploaded by seller
    if (existingProduct) {
      req.files.forEach((file) => {
        const filePath = path.join(__dirname, "../public", file.filename);
        fs.unlink(filePath, (err) => {
          if (err) console.error(`Failed to delete image: ${filePath}`, err);
        });
      });

      // sending response if product already exist with same name and seller
      return res
        .status(400)
        .json(
          new ApiResponse(
            null,
            "Product with this name already exists for this seller."
          )
        );
    }

    // if product is variable means it has different color sizes etc then count each of its stock and set it as total stock which is countInStock field in product model
    if (isVariable && variants?.length > 0) {
      const stocks = variants.reduce((acc, variant) => {
        return acc + Number(variant.stock);
      }, 0);
      countInStock = stocks;
    }

    // generating unique slug for product will be used in future for getting specific product
    const generateSlug = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-")
      .replace(/^-+|-+$/g, "");

    //  looping through our images in server uploaded through multer to our server and assigning the array to variables to upload it to cloud plateform like cloudinary aws s3 etc
    const localImagesPaths = req.files.map((imageInfo) => imageInfo.path);

    // uploading images to cloudinary
    const imagesUploadedToCloudinary = await uploadToCloudinary(
      localImagesPaths
    );

    // if there is an error occur in uploading images to cloudinary then send response and delete all the images from server
    if (!imagesUploadedToCloudinary) {
      req.files.forEach((file) => {
        const filePath = path.join(__dirname, "../public", file.filename);
        fs.unlink(filePath, (err) => {
          if (err) console.error(`Failed to delete image: ${filePath}`, err);
        });
      });

      return res
        .status(400)
        .json(
          new ApiResponse(null, "Error uploading images, please try again.")
        );
    }

    // assigning cloudinary images urls array to to variable
    const imagesUrls = imagesUploadedToCloudinary.map((image) => image.url);

    // assigning cloudinary images public ids array to to variable  for further operation like deleting image when product is deleted etc we implememt the deleting operation through public ids
    const imagesPublicids = imagesUploadedToCloudinary.map(
      (image) => image.public_id
    );

    const savedProduct = new Product({
      seller: sellerId,
      name,
      description,
      price,
      discountedPrice,
      countInStock,
      categories,
      isVariable,
      variants,
      images: imagesUrls,
      imagesPublicIds: imagesPublicids,
      slug: generateSlug,
    });

    // saving product in db
    await savedProduct.save();

    // sending success response after product successfully created
    return res
      .status(201)
      .json(new ApiResponse(savedProduct, "Product created successfully."));
  } catch (error) {
    req.files.forEach((file) => {
      const filePath = path.join(__dirname, "../public", file.filename);
      fs.unlink(filePath, (err) => {
        if (err) console.error(`Failed to delete image: ${filePath}`, err);
      });
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

    const imagesPublicIdArray = productExist.imagesPublicIds;

    const deleteProductImages = imagesPublicIdArray.map((publicId) => {
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
