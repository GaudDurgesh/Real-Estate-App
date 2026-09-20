import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getLeases = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const role = req.user.role.toLowerCase();

    if (role !== "tenant" && role !== "manager") {
      res.status(403).json({ message: "Access Denied" });
      return;
    }

    const leases = await prisma.lease.findMany({
      where:
        role === "tenant"
          ? { tenantCognitoId: req.user.id }
          : {
            property: {
              managerCognitoId: req.user.id,
            },
          },
      include: {
        tenant: true,
        property: true,
      },
      orderBy: {
        startDate: "desc",
      },
    });

    res.json(leases);
  } catch (error: any) {
    res.status(500).json({
      message: `Error retrieving leases: ${error.message}`,
    });
  }
};

export const getLeasePayments = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const leaseId = Number(req.params.id);

    if (!Number.isSafeInteger(leaseId) || leaseId <= 0) {
      res.status(400).json({ message: "Invalid lease ID" });
      return;
    }

    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      select: {
        tenantCognitoId: true,
        property: {
          select: { managerCognitoId: true },
        },
      },
    });

    if (!lease) {
      res.status(404).json({ message: "Lease not found" });
      return;
    }

    const role = req.user.role.toLowerCase();
    const hasAccess =
      (role === "tenant" &&
        lease.tenantCognitoId === req.user.id) ||
      (role === "manager" &&
        lease.property.managerCognitoId === req.user.id);

    if (!hasAccess) {
      res.status(403).json({ message: "Access Denied" });
      return;
    }

    const payments = await prisma.payment.findMany({
      where: { leaseId },
      orderBy: { dueDate: "desc" },
    });

    res.json(payments);
  } catch (error: any) {
    res.status(500).json({
      message: `Error retrieving lease payments: ${error.message}`,
    });
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
        payments: true,
      },
    });

    res.json(leases);
  } catch (error: any) {
    res.status(500).json({
      message: `Error retrieving property leases: ${error.message}`,
    });
  }
};