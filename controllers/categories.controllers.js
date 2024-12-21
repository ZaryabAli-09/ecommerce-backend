import { Category } from "../models/category.model.js";
import { ApiResponse } from "../utils/apiResponse.js";

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
