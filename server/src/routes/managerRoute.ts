import express from "express";
import {
  getManager,
  createManager,
  getManagerProperties,
  updateManager
} from "../controllers/managerController";

const router = express.Router();

router.param("cognitoId", (req, res, next, cognitoId) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (cognitoId !== req.user.id) {
    res.status(403).json({ message: "Access Denied" });
    return;
  }

  next();
});

router.get("/:cognitoId", getManager);
router.put("/:cognitoId", updateManager)
router.get("/:cognitoId/properties", getManagerProperties);
router.post("/", createManager);

export default router;