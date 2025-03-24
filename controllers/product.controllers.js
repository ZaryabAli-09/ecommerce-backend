import { Product } from "../models/product.model.js";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";
import crypto from "crypto";

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
        variant.discountedPrice === "null" || 0 || ""
          ? null
          : variant.discountedPrice,
    }));

    // check if product with same name is already in db
    const existingProduct = await Product.findOne({ name, seller: sellerId });

    // if product is already present in db then delete the images that is on our server uploaded by seller
    if (existingProduct) {
      await Promise.all(
        Object.values(req.files)
          .flat()
          .map(({ path }) => fs.promises.unlink(path))
      );

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
    // Track all unique images using a Map (hash -> cloudinary data)
    const allImageFiles = [];

    // Collect all image files with their variant indexes
    variants.forEach((_, index) => {
      const variantFiles = req.files?.[`variants[${index}][images]`] || [];
      const filesArray = Array.isArray(variantFiles)
        ? variantFiles
        : [variantFiles];
      filesArray.forEach((file) => {
        allImageFiles.push({
          variantIndex: index,
          file,
        });
      });
    });

    // Generate hashes for all images
    await Promise.all(
      allImageFiles.map(async ({ file }) => {
        if (!file.hash) {
          const fileBuffer = await fs.promises.readFile(file.path);
          file.hash = crypto
            .createHash("sha256")
            .update(fileBuffer)
            .digest("hex");
        }
      })
    );

    // Upload unique images to Cloudinary
    const uniqueUploads = new Map();
    for (const { file } of allImageFiles) {
      if (!uniqueUploads.has(file.hash)) {
        try {
          const uploadResult = await cloudinary.uploader.upload(file.path, {
            folder: "product-images",
          });
          uniqueUploads.set(file.hash, {
            url: uploadResult.secure_url,
            public_id: uploadResult.public_id,
          });
        } catch (error) {
          // Cleanup uploaded images if any fail
          await Promise.all(
            [...uniqueUploads.values()].map((img) =>
              cloudinary.uploader.destroy(img.public_id)
            )
          );
          throw new ApiError(500, "Failed to upload images to Cloudinary");
        }
      }
    }

    // Map variants with image references
    const uploadedVariants = variants.map((variant, index) => {
      const variantFiles = allImageFiles
        .filter((f) => f.variantIndex === index)
        .map((f) => f.file);

      return {
        ...variant,
        images: variantFiles.map((file) => ({
          url: uniqueUploads.get(file.hash).url,
          public_id: uniqueUploads.get(file.hash).public_id,
        })),
      };
    });
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
    // Cleanup temporary files
    await Promise.all(
      Object.values(req.files)
        .flat()
        .map(({ path }) => fs.promises.unlink(path))
    );

    // sending success response after product successfully created
    return res
      .status(201)
      .json(new ApiResponse(newProduct, "Product created successfully."));
  } catch (error) {
    await Promise.all(
      Object.values(req.files)
        .flat()
        .map(({ path }) => fs.promises.unlink(path))
    );

    next(error);
  }
}

// future note : we also make sure to delete its reviews
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
    const allImagesPublicIds = productExist.variants.flatMap((variant) =>
      variant.images.map((image) => image.public_id)
    );

    console.log(allImagesPublicIds);
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
const deleteProductImage = async (req, res, next) => {
  const { publicId, productId, variantIndex, imageIndex } = req.params;

  try {
    // Step 1: Delete the image from Cloudinary
    const deletedImg = await cloudinary.uploader.destroy(publicId);
    if (!deletedImg) {
      throw new ApiError(400, "Something went wrong. Please try again later.");
    }

    // Step 2: Find the product by ID
    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, "Product not found.");
    }

    // Step 3: Remove the image from the specific variant
    const variant = product.variants[variantIndex];
    if (!variant) {
      throw new ApiError(404, "Variant not found.");
    }

    // Remove the image at the specified index
    variant.images.splice(imageIndex, 1);

    // Step 4: Save the updated product
    await product.save();

    // Step 5: Send success response
    res.status(200).json(new ApiResponse("Image deleted successfully."));
  } catch (error) {
    next(error);
  }
};
async function updateProduct(req, res, next) {
  try {
    const { productId } = req.params;
    const sellerId = req.seller._id;

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

    const { variants: updatedVariants, ...otherFields } = req.body;

    // Calculate the new countInStock by summing the stock of all variants
    const newCountInStock = updatedVariants.reduce(
      (acc, variant) => acc + Number(variant.stock || 0),
      0
    );

    // Update the product with new variants and other fields
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        ...otherFields,
        variants: updatedVariants,
        countInStock: newCountInStock,
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
    const { page, limit, name, minPrice, maxPrice, minSold, dummy } = req.query;

    // Check if dummy data is requested
    if (dummy === "true") {
      const dummyProducts = generateDummyProducts(40); // Generate dummy products
      return res
        .status(200)
        .json(
          new ApiResponse(
            dummyProducts,
            "Dummy products retrieved successfully."
          )
        );
    }

    const query = { seller: sellerId };

    // Add filters to the query
    if (name) query.name = { $regex: name, $options: "i" }; // Case-insensitive search
    if (minPrice) query["variants.price"] = { $gte: Number(minPrice) };
    if (maxPrice)
      query["variants.price"] = {
        ...query["variants.price"],
        $lte: Number(maxPrice),
      };
    if (minSold) query.sold = { $gte: Number(minSold) };

    // Get the total count of products matching the query
    const total = await Product.countDocuments(query);

    // Pagination logic
    const skip = (page - 1) * limit;
    const products = await Product.find(query)
      .populate("categories", "name")
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json(
      new ApiResponse(
        {
          data: products,
          total, // Include the total count in the response
        },
        "Seller products retrieved successfully."
      )
    );
  } catch (error) {
    next(error);
  }
}
// Function to generate dummy products
function generateDummyProducts(count) {
  const dummyProducts = [];
  for (let i = 1; i <= count; i++) {
    dummyProducts.push({
      _id: `dummy${i}`,
      name: `Product ${i}`,
      description: `Description for Product ${i}`,
      countInStock: Math.floor(Math.random() * 100), // Random stock between 0 and 100
      sold: Math.floor(Math.random() * 50), // Random sold count between 0 and 50
      categories: [
        { _id: `category${i}`, name: `Category ${i}` },
        { _id: `category${i + 1}`, name: `Category ${i + 1}` },
        { _id: `category${i + 1}`, name: `Category ${i + 1}` },
      ],
      variants: [
        {
          size: "M",
          color: "Red",
          discountedPrice: Math.floor(Math.random() * 100) + 50,
          price: Math.floor(Math.random() * 100) + 50,
          stock: Math.floor(Math.random() * 100),
          images: [
            {
              url: `https://via.placeholder.com/150?text=Product+${i}`,
              public_id: `dummy${i}`,
            },
          ],
        },
      ],
    });
  }
  return dummyProducts;
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
    const products = await Product.find()
      .populate("reviews")
      .populate("seller");

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
  deleteProductImage,
};
