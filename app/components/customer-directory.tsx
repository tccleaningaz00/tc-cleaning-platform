"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./customer-directory.module.css";

export type CustomerRecord = {
  customer_id: string;
  property_id: string | null;
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

type ClientFormValues = {
  firstName: string; lastName: string; phone: string; email: string;
  addressLine1: string; addressLine2: string; city: string; state: string;
  zipCode: string; bedrooms: string; bathrooms: string; squareFeet: string;
  propertyType: string; frequencyCategory: string; serviceNotes: string;
};

function clientFormValues(customer?: CustomerRecord): ClientFormValues {
  return {
    firstName: customer?.first_name || "",
    lastName: customer?.last_name || "",
    phone: customer?.phone || "", email: customer?.email || "",
    addressLine1: customer?.address_line1 || "", addressLine2: customer?.address_line2 || "",
    city: customer?.city || "", state: customer?.state || "AZ", zipCode: customer?.zip_code || "",
    bedrooms: customer?.bedrooms == null ? "" : String(customer.bedrooms),
    bathrooms: customer?.bathrooms == null ? "" : String(customer.bathrooms),
    squareFeet: customer?.square_feet == null ? "" : String(customer.square_feet),
    propertyType: customer?.property_type || "", frequencyCategory: customer?.frequency_category || "",
    serviceNotes: customer?.service_notes || "",
  };
}

function ClientForm({ customer, onCancel, onSaved }: { customer?: CustomerRecord; onCancel: () => void; onSaved: () => void }) {
  const [values, setValues] = useState(() => clientFormValues(customer));
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setMessage(""); setError(false);
    const payload = {
      ...values,
      bedrooms: values.bedrooms ? Number(values.bedrooms) : null,
      bathrooms: values.bathrooms ? Number(values.bathrooms) : null,
      squareFeet: values.squareFeet ? Number(values.squareFeet) : null,
      ...(customer?.property_id ? { propertyId: customer.property_id } : {}),
    };
    try {
      const response = await fetch(customer ? `/api/manager/customers/${customer.customer_id}` : "/api/manager/customers", {
        method: customer ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Client details could not be saved.");
      setMessage(customer ? "Client information updated." : "Client added to the directory.");
      onSaved();
    } catch (reason) {
      setError(true);
      setMessage(reason instanceof Error ? reason.message : "Client details could not be saved.");
    } finally { setSaving(false); }
  }

  function field(key: keyof ClientFormValues, label: string, options: { required?: boolean; type?: string; placeholder?: string; wide?: boolean; step?: string } = {}) {
    return <label className={options.wide ? styles.formFieldWide : undefined} key={key}><span>{label}{options.required ? " *" : ""}</span><input type={options.type || "text"} step={options.step} required={options.required} value={values[key]} placeholder={options.placeholder} onChange={(event) => setValues({ ...values, [key]: event.target.value })} /></label>;
  }

  return <form className={styles.clientForm} onSubmit={submit}>
    <div className={styles.formHeading}><div><h3>{customer ? `Update ${customer.roster_name}` : "New client details"}</h3><p>Enter the client and property information below. At least one phone number or email is needed.</p></div><button type="button" className={styles.formClose} onClick={onCancel} aria-label="Close client form">×</button></div>
    <div className={styles.formGrid}>
      {field("firstName", "First name", { required: true })}{field("lastName", "Last name", { required: true })}
      {field("phone", "Phone", { type: "tel", placeholder: "(480) 555-0100" })}{field("email", "Email", { type: "email" })}
      {field("addressLine1", "Street address", { required: true, wide: true })}{field("addressLine2", "Unit / apartment")}
      {field("city", "City", { required: true })}{field("state", "State", { required: true })}{field("zipCode", "ZIP code", { required: true })}
      {field("bedrooms", "Bedrooms", { type: "number", step: "1" })}{field("bathrooms", "Bathrooms", { type: "number", step: "0.5" })}{field("squareFeet", "Square feet", { type: "number", step: "1" })}
      {field("propertyType", "Property type", { placeholder: "House, condo, apartment…" })}{field("frequencyCategory", "Service frequency", { placeholder: "Weekly, biweekly, one-time…" })}
      <label className={`${styles.formFieldWide} ${styles.notesField}`}><span>Service notes</span><textarea rows={4} value={values.serviceNotes} onChange={(event) => setValues({ ...values, serviceNotes: event.target.value })} placeholder="Access details, client preferences, or agreed service scope" /></label>
    </div>
    {message && <p className={error ? styles.formError : styles.formSuccess} role={error ? "alert" : "status"}>{message}</p>}
    <div className={styles.formActions}><button type="button" className={styles.cancelButton} onClick={onCancel}>Cancel</button><button type="submit" disabled={saving}>{saving ? "Saving…" : customer ? "Save client changes" : "Add client"}</button></div>
  </form>;
}

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
  const [showIntake, setShowIntake] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const router = useRouter();
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
      customer.email,
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
        <button className={styles.addClientButton} type="button" onClick={() => { setEditingCustomer(null); setShowIntake((visible) => !visible); }}>+ Add new client</button>
      </div>

      {showIntake && <ClientForm onCancel={() => setShowIntake(false)} onSaved={() => { setShowIntake(false); router.refresh(); }} />}

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
                <button type="button" className={styles.editClientButton} onClick={() => { setShowIntake(false); setEditingCustomer((current) => current?.customer_id === customer.customer_id && current.property_id === customer.property_id ? null : customer); }}>
                  {editingCustomer?.customer_id === customer.customer_id && editingCustomer.property_id === customer.property_id ? "Cancel editing" : "Edit client information"}
                </button>
                {editingCustomer?.customer_id === customer.customer_id && editingCustomer.property_id === customer.property_id && <ClientForm customer={customer} onCancel={() => setEditingCustomer(null)} onSaved={() => { setEditingCustomer(null); router.refresh(); }} />}
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
