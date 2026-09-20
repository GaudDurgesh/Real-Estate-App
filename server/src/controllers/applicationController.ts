import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const listApplications = async (
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

    const whereClause =
      role === "tenant"
        ? { tenantCognitoId: req.user.id }
        : {
          property: {
            managerCognitoId: req.user.id,
          },
        };
        
    const applications = await prisma.application.findMany({
      where: whereClause,
      include: {
        property: {
          include: {
            location: true,
            manager: true,
          },
        },
        tenant: true,
        lease: true,
      },
    });

    function calculateNextPaymentDate(startDate: Date): Date {
      const today = new Date();
      const nextPaymentDate = new Date(startDate);
      while (nextPaymentDate <= today) {
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      }
      return nextPaymentDate;
    }

    const formattedApplications = await Promise.all(
      applications.map(async (app) => {
        const lease = app.lease;
        return {
          ...app,
          property: {
            ...app.property,
            address: app.property.location.address,
          },
          manager: app.property.manager,
          lease: lease
            ? {
              ...lease,
              nextPaymentDate: calculateNextPaymentDate(lease.startDate),
            }
            : null,
        };
      }),
    );
    res.json(formattedApplications);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving applications: ${error.message}` });
  }
};

export const createApplication = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const tenantCognitoId = req.user.id;
    const {
      applicationDate,
      propertyId,
      name,
      email,
      phoneNumber,
      message,
    } = req.body;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { pricePerMonth: true, securityDeposit: true },
    });

    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }

    const newApplication = await prisma.application.create({
      data: {
        applicationDate: new Date(applicationDate),
        status: "Pending",
        name,
        email,
        phoneNumber,
        message,
        property: {
          connect: { id: propertyId },
        },
        tenant: {
          connect: { cognitoId: tenantCognitoId },
        },
      },
      include: {
        property: true,
        tenant: true,
        lease: true,
      },
    });

    res.status(201).json(newApplication);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error creating application: ${error.message}` });
  }
};

export const updateApplicationStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (status !== "Approved" && status !== "Denied") {
      res.status(400).json({ message: "Invalid application status" });
      return;
    }
    console.log("status:", status);

    const application = await prisma.application.findUnique({
      where: { id: Number(id) },
      include: {
        property: true,
        tenant: true,
      },
    });

    if (!application) {
      res.status(404).json({ message: "Application not found." });
      return;
    }

    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (application.property.managerCognitoId !== req.user.id) {
      res.status(403).json({
        message: "You can only manage applications for your own properties.",
      });
      return;
    }

    const wasUpdated = await prisma.$transaction(async (tx) => {
      // Sirf Pending application ka decision ek baar save hoga.
      const result = await tx.application.updateMany({
        where: {
          id: application.id,
          status: "Pending",
        },
        data: { status },
      });

      if (result.count === 0) {
        return false;
      }

      if (status === "Approved") {
        // Purane code se linked lease bani ho, toh dobara mat banao.
        let leaseId = application.leaseId;

        if (leaseId === null) {
          const startDate = new Date();
          const endDate = new Date(startDate);
          endDate.setFullYear(endDate.getFullYear() + 1);

          const newLease = await tx.lease.create({
            data: {
              startDate,
              endDate,
              rent: application.property.pricePerMonth,
              deposit: application.property.securityDeposit,
              propertyId: application.propertyId,
              tenantCognitoId: application.tenantCognitoId,
            },
          });

          leaseId = newLease.id;
        }

        await tx.property.update({
          where: { id: application.propertyId },
          data: {
            tenants: {
              connect: { cognitoId: application.tenantCognitoId },
            },
          },
        });

        await tx.application.update({
          where: { id: application.id },
          data: { leaseId },
        });
      }

      return true;
    });

    if (!wasUpdated) {
      res.status(409).json({
        message: "This application has already been processed.",
      });
      return;
    }

    // Respond with the updated application details
    const updatedApplication = await prisma.application.findUnique({
      where: { id: Number(id) },
      include: {
        property: true,
        tenant: true,
        lease: true,
      },
    });

    res.json(updatedApplication);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error updating application status: ${error.message}` });
  }
};
