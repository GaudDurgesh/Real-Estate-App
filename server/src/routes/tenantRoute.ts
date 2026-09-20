import express from "express";
import {
  getTenant,
  createTenant,
  updateTenant,
  getCurrentResidences,
  addFavoriteProperty,
  removeFavoriteProperty,
} from "../controllers/tenantController";

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

router.get("/:cognitoId", getTenant);
router.put("/:cognitoId", updateTenant)
router.post("/", createTenant);
router.get("/:cognitoId/current-residences", getCurrentResidences);
router.post("/:cognitoId/favorites/:propertyId", addFavoriteProperty)
router.delete("/:cognitoId/favorites/:propertyId", removeFavoriteProperty)

export default router;