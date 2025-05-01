import express from "express";
import {
  addAdmin,
  adminLogin,
  adminLogout,
  adminUpdateCredentials,
  getAllAdmins,
  getSingleAdmin,
} from "../controllers/adminAuth.controllers.js";
import { verifyAdmin } from "../middlwares/verifyAdmin.js";

const router = express.Router();

router.get("/single", verifyAdmin, getSingleAdmin);
router.post("/login", adminLogin);
router.post("/logout", adminLogout);
router.post("/new", verifyAdmin, addAdmin);
router.get("/all", verifyAdmin, getAllAdmins);

router.post("/logout", adminLogout);

router.put("/update-credentials", verifyAdmin, adminUpdateCredentials);

export default router;
