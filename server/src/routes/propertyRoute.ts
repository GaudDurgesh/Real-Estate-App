import express from "express";
import {
  getProperties,
  getProperty,
  createProperty,
} from "../controllers/propertyController";
import multer from "multer";
import { getPropertyLeases } from "../controllers/leaseController";
import { authMiddleware } from "../middleware/authMiddleware";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

router.get("/", getProperties);
router.get(
  "/:id/leases",
  authMiddleware(["manager"]),
  getPropertyLeases,
);
router.get("/:id", getProperty);
router.post(
  "/",
  authMiddleware(["manager"]),
  upload.array("photos"),
  createProperty
);

export default router;