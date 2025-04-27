import express from "express";
import {
  addAdmin,
  adminLogin,
  adminLogout,
  adminUpdateCredentials,
  getAllAdmins,
} from "../controllers/adminAuth.controllers.js";
import { verifyAdmin } from "../middlwares/verifyAdmin.js";

const router = express.Router();

router.post("/login", adminLogin);
router.post("/logout", adminLogout);
router.post("/new", addAdmin);
router.get("/all", getAllAdmins);

router.post("/logout", adminLogout);

router.put("/update-credentials", verifyAdmin, adminUpdateCredentials);

export default router;
