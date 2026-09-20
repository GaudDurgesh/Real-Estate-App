import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getLeases = async (req: Request, res: Response): Promise<void> => {
  try {
    const leases = await prisma.lease.findMany({
      include: {
        tenant: true,
        property: true,
      },
    });

    res.json(leases);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving leases: ${error.message}` });
  }
};

export const getLeasePayments = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const payments = await prisma.payment.findMany({
      where: { leaseId: Number(id) },
    });
    res.json(payments);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving lease payments: ${error.message}` });
  }
};



export const getPropertyLeases = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const propertyId = Number(req.params.id);

    if (!Number.isSafeInteger(propertyId) || propertyId <= 0) {
      res.status(400).json({ message: "Invalid property ID" });
      return;
    }

    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { managerCognitoId: true },
    });

    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }

    if (property.managerCognitoId !== req.user.id) {
      res.status(403).json({ message: "Access Denied" });
      return;
    }

    const leases = await prisma.lease.findMany({
      where: { propertyId },
      include: {
        tenant: true,
        property: true,
      },
    });

    res.json(leases);
  } catch (error: any) {
    res.status(500).json({
      message: `Error retrieving property leases: ${error.message}`,
    });
  }
};