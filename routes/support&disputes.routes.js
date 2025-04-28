import express from "express";
import {
  createDispute,
  getAllDisputes,
  updateDisputeStatus,
} from "../controllers/support&disputes.controllers.js";
import { verifySeller } from "../middlwares/verifySeller.js";
import { verifyUser } from "../middlwares/verifyUser.js";

const router = express.Router();

router.post("/seller/create", verifySeller, createDispute);
router.post("/buyer/create", verifyUser, createDispute);

router.get("/all", getAllDisputes);

router.put("/update/:disputeId", updateDisputeStatus);

export default router;
