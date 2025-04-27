import express from "express";
import {
  createCategories,
  getAllCategories,
} from "../controllers/categories.controllers.js";
import { verifyAdmin } from "../middlwares/verifyAdmin.js";

const router = express.Router();

// admin route

// add admin controller to create category function
router.post("/create-categories", verifyAdmin, createCategories);

// consumer route
router.get("/categories", getAllCategories);

export default router;
