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
      propertyId: rawPropertyId,
      name,
      email,
      phoneNumber,
      message,
    } = req.body;

    const propertyId = Number(rawPropertyId);

    if (!Number.isSafeInteger(propertyId) || propertyId <= 0) {
      res.status(400).json({ message: "Invalid property ID" });
      return;
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // Same property ki submission requests ko serialize karta hai.
        const properties = await tx.$queryRaw<{ id: number }[]>`
          SELECT id
          FROM "Property"
          WHERE id = ${propertyId}
          FOR UPDATE
        `;

        if (properties.length === 0) {
          return {
            error: "Property not found",
            status: 404,
          };
        }

        const pendingApplication = await tx.application.findFirst({
          where: {
            propertyId,
            tenantCognitoId,
            status: "Pending",
          },
          select: { id: true },
        });

        if (pendingApplication) {
          return {
            error: "You already have a pending application for this property.",
            status: 409,
          };
        }

        const existingLease = await tx.lease.findFirst({
          where: {
            propertyId,
            tenantCognitoId,
            endDate: { gt: new Date() },
          },
          select: { id: true },
        });

        if (existingLease) {
          return {
            error: "You already have a current or upcoming lease for this property.",
            status: 409,
          };
        }

        const application = await tx.application.create({
          data: {
            applicationDate: new Date(),
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

        return { application };
      },
      {
        isolationLevel: "ReadCommitted",
      },
    );

    if (result.status !== undefined) {
      res.status(result.status).json({ message: result.error });
      return;
    }

    res.status(201).json(result.application);
  } catch (error: any) {
    res.status(500).json({
      message: `Error creating application: ${error.message}`,
    });
  }
};


export const updateApplicationStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const managerCognitoId = req.user.id;
    const applicationId = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isSafeInteger(applicationId) || applicationId <= 0) {
      res.status(400).json({ message: "Invalid application ID" });
      return;
    }

    if (status !== "Approved" && status !== "Denied") {
      res.status(400).json({ message: "Invalid application status" });
      return;
    }

    const reference = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { propertyId: true },
    });

    if (!reference) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // Submission aur approval dono same property lock use karte hain.
        const properties = await tx.$queryRaw<{ id: number }[]>`
          SELECT id
          FROM "Property"
          WHERE id = ${reference.propertyId}
          FOR UPDATE
        `;

        if (properties.length === 0) {
          return { status: 404, error: "Property not found" };
        }

        // Lock milne ke baad latest application state read karo.
        const application = await tx.application.findUnique({
          where: { id: applicationId },
          include: {
            property: true,
            lease: true,
          },
        });

        if (!application) {
          return { status: 404, error: "Application not found" };
        }

        if (application.property.managerCognitoId !== managerCognitoId) {
          return {
            status: 403,
            error: "You can only manage applications for your own properties.",
          };
        }

        if (application.status !== "Pending") {
          return {
            status: 409,
            error: "This application has already been processed.",
          };
        }

        let leaseId = application.leaseId;

        if (status === "Approved") {
          const existingLease = application.lease;
          const startDate = existingLease
            ? new Date(existingLease.startDate)
            : new Date();

          const endDate = existingLease
            ? new Date(existingLease.endDate)
            : new Date(startDate);

          if (!existingLease) {
            endDate.setFullYear(endDate.getFullYear() + 1);
          }

          if (
            endDate <= startDate ||
            endDate <= new Date() ||
            (existingLease &&
              (existingLease.propertyId !== application.propertyId ||
                existingLease.tenantCognitoId !== application.tenantCognitoId))
          ) {
            return {
              status: 409,
              error: "The linked lease is invalid or expired. Review it before approval.",
            };
          }

          const overlappingLease = await tx.lease.findFirst({
            where: {
              propertyId: application.propertyId,
              startDate: { lt: endDate },
              endDate: { gt: startDate },
              ...(leaseId !== null ? { id: { not: leaseId } } : {}),
            },
            select: { id: true },
          });

          if (overlappingLease) {
            return {
              status: 409,
              error: "This property already has a lease overlapping this period.",
            };
          }

          if (leaseId === null) {
            const lease = await tx.lease.create({
              data: {
                startDate,
                endDate,
                rent: application.property.pricePerMonth,
                deposit: application.property.securityDeposit,
                propertyId: application.propertyId,
                tenantCognitoId: application.tenantCognitoId,
              },
            });

            leaseId = lease.id;
          }

          await tx.property.update({
            where: { id: application.propertyId },
            data: {
              tenants: {
                connect: { cognitoId: application.tenantCognitoId },
              },
            },
          });
        }

        const updatedApplication = await tx.application.update({
          where: { id: applicationId },
          data: {
            status,
            ...(status === "Approved" ? { leaseId } : {}),
          },
          include: {
            property: true,
            tenant: true,
            lease: true,
          },
        });

        return { application: updatedApplication };
      },
      {
        isolationLevel: "ReadCommitted",
      },
    );

    if (result.status !== undefined) {
      res.status(result.status).json({ message: result.error });
      return;
    }

    res.json(result.application);
  } catch (error: any) {
    res.status(500).json({
      message: `Error updating application status: ${error.message}`,
    });
  }
};