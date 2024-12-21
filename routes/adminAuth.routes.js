import express from "express";
import { adminLogin } from "../controllers/adminAuth.controllers.js";

const router = express.Router();

router.post("/login", adminLogin);

export default router;
