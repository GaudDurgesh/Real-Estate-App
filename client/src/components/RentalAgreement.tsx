"use client";

import styles from "./RentalAgreement.module.css";

export type AgreementData = {
  leaseId: number;
  propertyName: string;
  address: string;
  tenantName: string;
  managerName: string;
  rent: number;
  deposit: number;
  startDate: string | Date;
  endDate: string | Date;
};

type RentalAgreementProps = {
  data: AgreementData;
  onPrint: () => void;
};

const formatDate = (value: string | Date) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const formatAmount = (value: number) =>
  Number.isFinite(value)
    ? `$${value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : "Not available";

export default function RentalAgreement({
  data,
  onPrint,
}: RentalAgreementProps) {
  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <span className={styles.toolbarLabel}>Lease summary preview</span>
        <button type="button" onClick={onPrint} className={styles.printBtn}>
          Print / Save as PDF
        </button>
      </div>

      <main className={styles.document}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.brand}>HAVENSPACE</span>
            <h1 className={styles.title}>Rental Agreement</h1>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.refRow}>
              <span className={styles.refLabel}>Lease reference</span>
              <span className={styles.refNum}>#{data.leaseId}</span>
            </div>
            <span className={styles.badge}>Unsigned</span>
          </div>
        </header>

        {/* Property */}
        <section className={styles.propertyBlock}>
          <h2 className={styles.propertyName}>{data.propertyName}</h2>
          <p className={styles.address}>{data.address}</p>
        </section>

        {/* Divider */}
        <hr className={styles.rule} />

        {/* Parties */}
        <section className={styles.section}>
          <h3 className={styles.sectionHeading}>Parties</h3>
          <div className={styles.grid2}>
            <div className={styles.partyCol}>
              <p className={styles.fieldLabel}>Tenant</p>
              <p className={styles.fieldValue}>{data.tenantName}</p>
            </div>
            <div className={styles.partyCol}>
              <p className={styles.fieldLabel}>Property Manager</p>
              <p className={styles.fieldValue}>{data.managerName}</p>
            </div>
          </div>
        </section>

        <hr className={styles.rule} />

        {/* Lease period */}
        <section className={styles.section}>
          <h3 className={styles.sectionHeading}>Lease Period</h3>
          <div className={styles.grid2}>
            <div>
              <p className={styles.fieldLabel}>Start date</p>
              <p className={styles.dateValue}>{formatDate(data.startDate)}</p>
            </div>
            <div>
              <p className={styles.fieldLabel}>End date</p>
              <p className={styles.dateValue}>{formatDate(data.endDate)}</p>
            </div>
          </div>
        </section>

        <hr className={styles.rule} />

        {/* Financial */}
        <section className={styles.section}>
          <h3 className={styles.sectionHeading}>Financial Summary</h3>
          <table className={styles.finTable}>
            <thead>
              <tr>
                <th className={styles.finTh}>Description</th>
                <th className={`${styles.finTh} ${styles.finThRight}`}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className={styles.finRow}>
                <td className={styles.finTd}>
                  <span className={styles.finDesc}>Monthly rent</span>
                  <span className={styles.finSub}>Per calendar month</span>
                </td>
                <td className={`${styles.finTd} ${styles.finAmount}`}>
                  {formatAmount(data.rent)}
                </td>
              </tr>
              <tr className={styles.finRow}>
                <td className={styles.finTd}>
                  <span className={styles.finDesc}>Security deposit</span>
                  <span className={styles.finSub}>Recorded lease deposit</span>
                </td>
                <td className={`${styles.finTd} ${styles.finAmount}`}>
                  {formatAmount(data.deposit)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <hr className={styles.rule} />

        {/* Signatures */}
        <section className={`${styles.section} ${styles.sigSection}`}>
          <h3 className={styles.sectionHeading}>Signatures</h3>
          <div className={styles.grid2}>
            <div className={styles.sigCol}>
              <div className={styles.sigSpace} />
              <div className={styles.sigLine} />
              <p className={styles.sigName}>{data.tenantName}</p>
              <p className={styles.sigRole}>Tenant</p>
              <p className={styles.sigDateLine}>Date: ___________________</p>
            </div>
            <div className={styles.sigCol}>
              <div className={styles.sigSpace} />
              <div className={styles.sigLine} />
              <p className={styles.sigName}>{data.managerName}</p>
              <p className={styles.sigRole}>Property Manager</p>
              <p className={styles.sigDateLine}>Date: ___________________</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <strong className={styles.footerBrand}>HAVENSPACE</strong>
          <span>College project demonstration — unsigned lease summary.</span>
        </footer>
      </main>
    </div>
  );
}