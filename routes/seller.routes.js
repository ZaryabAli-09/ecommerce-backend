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
  getSellerBillingInfo,
  getPendingSellers,
  getSellerDetailsForAdminPanel,
  getSellerBasicInfo,
  getSellerAboutUsInfo,
} from "../controllers/seller.controllers.js";
import { upload } from "../middlwares/multerMiddleware.js";

const router = express.Router();

//handle image typ for logo and coverImage of seller/brand
const handleImageType = (type) => (req, res, next) => {
  req.imageType = type;
  next();
};

// admin routes and general buyer routes
router.get("/all", getAllSellers);
router.put("/admin/update/:sellerId", verifyAdmin, updateSeller);

router.get("/details/:sellerId", getSellerDetailsForAdminPanel);
router.get("/pending", verifyAdmin, getPendingSellers);
router.delete("/delete/:sellerId", verifyAdmin, deleteSeller);
router.get("/billingInfo", verifyAdmin, getSellerBillingInfo);

router.get("/single/basic-info/:sellerId", getSellerBasicInfo);
router.get("/single/about-us-info/:sellerId", getSellerAboutUsInfo);
// brand / seller routes
router.get(
  "/dashboard-information/:sellerId",
  verifySeller,
  sellerDashboardInformation
);
router.get("/single/:sellerId", getSingleSeller);
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
