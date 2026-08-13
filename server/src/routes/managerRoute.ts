import express from "express";
import {
  getManager,
  createManager,
  getManagerProperties,
  updateManager
} from "../controllers/managerController";

const router = express.Router();

router.get("/:cognitoId", getManager);
router.put("/:cognitoId", updateManager)
router.get("/:cognitoId/properties", getManagerProperties);
router.post("/", createManager);

export default router;