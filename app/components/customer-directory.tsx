"use client";

import { useMemo, useState } from "react";
import styles from "./customer-directory.module.css";

export type CustomerRecord = {
  customer_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  property_type: string | null;
  roster_name: string;
  alias_names: string | null;
  frequency_category: string | null;
  property_source_text: string;
  service_notes: string;
  november_schedule_reference: string;
  payment_cross_reference: string;
  review_flags: string | null;
  source_report_month: string;
};

export type ImportBatch = {
  id: string;
  source_file: string;
  report_month: string;
  client_count: number;
  zelle_linked_count: number;
  venmo_linked_count: number;
  both_linked_count: number;
  report_metadata_json: string;
};

type RevenueSnapshot = {
  identifiedElectronicReceipts?: number;
  identifiedCustomerRevenue?: number;
  venmo?: number;
  matchedZelle?: number;
  reconciledCash?: number;
  chaseCashDeposits?: number;
  venmoTransfundCashWithdrawals?: number;
  caveat?: string;
};

function money(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatAddress(customer: CustomerRecord) {
  return [
    [customer.address_line1, customer.address_line2].filter(Boolean).join(", "),
    [customer.city, customer.state, customer.zip_code].filter(Boolean).join(" "),
  ].filter(Boolean).join(", ");
}

export default function CustomerDirectory({
  customers,
  importBatch,
}: {
  customers: CustomerRecord[];
  importBatch: ImportBatch | null;
}) {
  const [search, setSearch] = useState("");
  const revenueSnapshot: RevenueSnapshot = useMemo(() => {
    if (!importBatch) return {};
    try {
      return JSON.parse(importBatch.report_metadata_json) as RevenueSnapshot;
    } catch {
      return {};
    }
  }, [importBatch]);

  const visibleCustomers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return customers;
    return customers.filter((customer) => [
      customer.roster_name,
      customer.alias_names,
      customer.phone,
      customer.address_line1,
      customer.address_line2,
      customer.city,
      customer.zip_code,
      customer.frequency_category,
      customer.service_notes,
    ].filter(Boolean).join(" ").toLocaleLowerCase().includes(query));
  }, [customers, search]);

  return (
    <>
      {importBatch && (
        <section className={styles.snapshot} aria-labelledby="revenue-snapshot-title">
          <div className={styles.snapshotHeader}>
            <div>
              <p className={styles.eyebrow}>SOURCE REPORT · {importBatch.report_month}</p>
              <h2 id="revenue-snapshot-title">October reconciliation snapshot</h2>
            </div>
            <span className={styles.rosterCount}>{importBatch.client_count} active clients</span>
          </div>
          <div className={styles.snapshotGrid}>
            <div><span>Identified electronic receipts</span><strong>{money(revenueSnapshot.identifiedElectronicReceipts)}</strong></div>
            <div><span>Identified customer revenue</span><strong>{money(revenueSnapshot.identifiedCustomerRevenue)}</strong></div>
            <div><span>Venmo</span><strong>{money(revenueSnapshot.venmo)}</strong></div>
            <div><span>Matched Zelle</span><strong>{money(revenueSnapshot.matchedZelle)}</strong></div>
            <div><span>Reconciled cash deposits</span><strong>{money(revenueSnapshot.reconciledCash)}</strong></div>
          </div>
          <p className={styles.caveat}>{revenueSnapshot.caveat || "Source-report totals only; they are not a complete revenue or payment ledger."}</p>
          <p className={styles.linkageSummary}>
            Payment name links in the source report: {importBatch.zelle_linked_count} Zelle, {importBatch.venmo_linked_count} Venmo, {importBatch.both_linked_count} both.
          </p>
        </section>
      )}

      <div className={styles.directoryToolbar}>
        <div>
          <h2>Active clients</h2>
          <p>{visibleCustomers.length} of {customers.length} clients</p>
        </div>
        <label className={styles.searchLabel}>
          <span>Search clients</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, city, service, or address"
          />
        </label>
      </div>

      {visibleCustomers.length ? (
        <div className={styles.customerGrid}>
          {visibleCustomers.map((customer) => {
            const address = formatAddress(customer);
            return (
              <article className={styles.customerCard} key={customer.customer_id}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3>{customer.roster_name}</h3>
                    {customer.alias_names && <p className={styles.alias}>Also listed as {customer.alias_names}</p>}
                  </div>
                  <span className={styles.status}>Active</span>
                </div>

                <p className={styles.category}>{customer.frequency_category || "Service frequency not listed"}</p>
                <div className={styles.property}>
                  <strong>{address || customer.property_source_text}</strong>
                  {(customer.bedrooms !== null || customer.bathrooms !== null || customer.square_feet !== null) && (
                    <span>
                      {[customer.square_feet ? `${customer.square_feet.toLocaleString()} sq ft` : null,
                        customer.bedrooms !== null ? `${customer.bedrooms} bed` : null,
                        customer.bathrooms !== null ? `${customer.bathrooms} bath` : null]
                        .filter(Boolean).join(" · ")}
                    </span>
                  )}
                  {customer.property_type && <span>{customer.property_type}</span>}
                  {customer.phone && <a href={`tel:${customer.phone}`}>{customer.phone}</a>}
                  {customer.email && <a href={`mailto:${customer.email}`}>{customer.email}</a>}
                </div>

                {customer.review_flags && <p className={styles.reviewFlag}>Review note: {customer.review_flags}</p>}

                <details className={styles.detailSection}>
                  <summary>Service and pricing notes</summary>
                  <p>{customer.service_notes}</p>
                </details>
                <details className={styles.detailSection}>
                  <summary>November schedule reference</summary>
                  <p>{customer.november_schedule_reference}</p>
                  <small>Transcribed from the source roster; this reference does not create or confirm an appointment.</small>
                </details>
                <details className={styles.detailSection}>
                  <summary>Payment reconciliation reference</summary>
                  <p>{customer.payment_cross_reference}</p>
                  <small>A roster cross-reference, not an individual payment ledger. “No confident match” does not mean unpaid.</small>
                </details>
              </article>
            );
          })}
        </div>
      ) : (
        <p className={styles.emptyState}>No clients match that search.</p>
      )}
    </>
  );
}
