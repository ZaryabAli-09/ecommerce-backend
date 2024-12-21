import express from "express";
import {
  createCategories,
  getAllCategories,
} from "../controllers/categories.controllers.js";
import { verifyAdmin } from "../middlwares/verifyAdmin.js";

const router = express.Router();

// admin route
router.post("/create-categories", verifyAdmin, createCategories);

// consumer route
router.get("/categories", getAllCategories);

export default router;
