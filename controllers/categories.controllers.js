import { Category } from "../models/category.model.js";
import { ApiResponse } from "../utils/apiResponse.js";

async function createCategories(req, res, next) {
  const { name, parent } = req.body;

  try {
    // Validate input
    if (!name || typeof name !== "string") {
      return res
        .status(400)
        .json(new ApiResponse(null, "Category name is required"));
    }

    // Check for existing category with same name (case-insensitive) in the same hierarchy
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") }, // Case-insensitive match
      parent: parent || { $exists: !parent }, // Match same parent (null if no parent)
    });

    if (existingCategory) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            null,
            `Category "${name}" already exists in this hierarchy`
          )
        );
    }

    // Create the new category
    const newCategory = new Category({ name, parent });
    await newCategory.save();

    // Update parent's subCategories if parent exists
    if (parent) {
      await Category.findByIdAndUpdate(
        parent,
        { $push: { subCategories: newCategory._id } },
        { new: true }
      );
    }

    return res
      .status(201)
      .json(new ApiResponse(newCategory, "New category created successfully."));
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

    res
      .status(200)
      .json(new ApiResponse(categories, "Successfully get all categories"));
  } catch (error) {
    next(error);
  }
}

export { createCategories, getAllCategories };
