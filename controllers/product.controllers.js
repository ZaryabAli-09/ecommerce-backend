import { Product } from "../models/product.model.js";
import { uploadToCloudinary } from "../config/cloudinary.config.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";
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

    // fields validation
    if (!name || !description || !price || !categories) {
      return res.status(400).json({
        message: "All product fields are required",
      });
    }

    //  image validation
    if (!req.files) {
      return res.status(400).json({
        message: "Please upload images",
      });
    }

    // find if product already exists with same name
    const existingProduct = await Product.findOne({ name });

    // if products exists then the provided image should be deleted
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

    // if product has different variants then we should calculate stocks of each variant
    if (isVariable) {
      if (variants?.length > 0) {
        const stocks = variants.reduce((acc, variant) => {
          const stockValue = Number(variant.stock);
          return acc + stockValue;
        }, 0);

        countInStock = stocks;
      }
    }

    // generating slug for product
    const generateSlug = name
      .toLowerCase()
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/[^\w\-]+/g, "") // Remove all non-word characters
      .replace(/\-\-+/g, "-") // Replace multiple hyphens with a single hyphen
      .replace(/^-+|-+$/g, "");

    const localImagesPaths = req.files?.map((imageInfo) => {
      return imageInfo.path;
    });

    // files uploading to cloudinary db
    const imagesUploadedToCloudinary = await uploadToCloudinary(
      localImagesPaths
    );

    if (!imagesUploadedToCloudinary) {
      return res.status(400).json({
        message: "Error occur while uploading images please try again",
      });
    }

    const imagesUrls = imagesUploadedToCloudinary.map((image) => image.url);
    // getting images public id saved in cloudinary for further operations and saving it in db
    const imagesPublicids = imagesUploadedToCloudinary.map(
      (image) => image.public_id
    );

    console.log("uploaded images urls", imagesUrls);
    console.log("uploaded images public ids", imagesPublicids);

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

    // saving the product
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

    console.log("deleted images url", deletedImagesresult);

    const productToBeDeleted = await Product.findByIdAndDelete(productId);

    res.status(200).json({
      message: "Product deleted successfully",
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
    const product = await Product.findById(productId)
      .populate({
        path: "reviews",
        populate: {
          path: "user",
          select: "name",
        },
      })
      .populate({ path: "categories", select: "name" });

    res.status(200).json({
      message: "Product retrieved successfully",
      product: product,
    });
  } catch (error) {
    next(error);
  }
}

// ...........................................................
// ...........................................................
// ...........................................................
// categories functions/controllers

export {
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getSingleProduct,
};
