"use client";

import ApplicationCard from "@/components/ApplicationCard";
import Header from "@/components/Header";
import Loading from "@/components/Loading";
import { useGetApplicationsQuery, useGetAuthUserQuery } from "@/state/api";
import { CircleCheckBig, Clock, Download, XCircle } from "lucide-react";
import React from "react";
import { printAgreement } from "@/lib/printAgreement";
import type { Application } from "@/types/prismaTypes";

const Applications = () => {
  const { data: authUser } = useGetAuthUserQuery();
  const {
    data: applications,
    isLoading,
    isError,
  } = useGetApplicationsQuery({
    userId: authUser?.cognitoInfo?.userId,
    userType: "tenant",
  });

  if (isLoading) return <Loading />;
  if (isError || !applications) return <div>Error fetching applications</div>;

  const handleDownloadAgreement = (application: Application) => {
    if (application.status !== "Approved" || !application.lease) {
      return;
    }

    printAgreement({
      leaseId: application.lease.id,
      propertyName: application.property.name,
      address: [
        application.property.location.address,
        application.property.location.city,
        application.property.location.state,
        application.property.location.postalCode,
        application.property.location.country,
      ]
        .filter(Boolean)
        .join(", "),
      tenantName: application.tenant.name,
      managerName: application.manager?.name || "Not available",
      rent: application.lease.rent,
      deposit: application.lease.deposit,
      startDate: application.lease.startDate,
      endDate: application.lease.endDate,
    });
  };

  return (
    <div className="dashboard-container">
      <Header
        title="Applications"
        subtitle="Track and manage your property rental applications"
      />
      <div className="w-full">
        {applications?.map((application) => (
          <ApplicationCard
            key={application.id}
            application={application}
            userType="renter"
          >
            <div className="flex justify-between gap-5 w-full pb-4 px-4">
              {application.status === "Approved" ? (
                <div className="bg-green-100 p-4 text-green-700 grow flex items-center">
                  <CircleCheckBig className="w-5 h-5 mr-2" />
                  The property is being rented by you until{" "}
                  {application.lease?.endDate
                    ? new Date(application.lease.endDate).toLocaleDateString()
                    : "—"}
                </div>
              ) : application.status === "Pending" ? (
                <div className="bg-yellow-100 p-4 text-yellow-700 grow flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Your application is pending approval
                </div>
              ) : (
                <div className="bg-red-100 p-4 text-red-700 grow flex items-center">
                  <XCircle className="w-5 h-5 mr-2" />
                  Your application has been denied
                </div>
              )}

              <button
                onClick={() => handleDownloadAgreement(application)}
                disabled={
                  application.status !== "Approved" || !application.lease
                }
                className="bg-white border border-gray-300 text-gray-700 py-2 px-4
    rounded-md flex items-center justify-center
    enabled:hover:bg-primary-700 enabled:hover:text-primary-50
    disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5 mr-2" />
                Download Agreement
              </button>
            </div>
          </ApplicationCard>
        ))}
      </div>
    </div>
  );
};

export default Applications;