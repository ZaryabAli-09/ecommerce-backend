import express from "express";
import { verifyAdmin } from "../middlwares/verifyAdmin.js";
import { verifyUser } from "../middlwares/verifyUser.js";
import { verifySeller } from "../middlwares/verifySeller.js";
import {
  deleteSeller,
  getAllSellers,
  getSingleSeller,
  sellerDashboardInformation,
  updateSeller,
  uploadImage,
} from "../controllers/seller.controllers.js";
import { upload } from "../middlwares/multerMiddleware.js";

const router = express.Router();

//handle image typ for logo and coverImage of seller/brand
const handleImageType = (type) => (req, res, next) => {
  req.imageType = type;
  next();
};

// Admin routes
// ... change middleware to  verifyAdmin after testing
router.get("/all", verifyUser, getAllSellers);
router.delete("/delete/:sellerId", verifyAdmin, deleteSeller);
router.get("/dashboard-information/:sellerId", sellerDashboardInformation);
// Buyer routes
router.get("/single/:sellerId", verifySeller, getSingleSeller);
router.put("/update/:sellerId", verifySeller, updateSeller);
router.patch(
  "/upload-logo",
  verifySeller,
  upload.single("image"),
  handleImageType("logo"),
  uploadImage
);

router.patch(
  "/upload-coverImage",
  verifySeller,
  upload.single("image"),
  handleImageType("coverImage"),
  uploadImage
);
export default router;
