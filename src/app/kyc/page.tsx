// KYC submission flow. Users land here when they hit a KYC gate (e.g. attempting
// an international wire without tier_3). The form collects identity, residence,
// and ID-document data; PII is sent over TLS and encrypted at rest by the API.

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import styles from "./kyc.module.css";

interface CountryEntry {
  iso2: string;
  name: string;
  sanctions: "none" | "enhanced_due_diligence" | "restricted" | "embargo";
  selectable: boolean;
}

interface KycCaseSummary {
  id?: string;
  status: string;
  level: string;
  isPep?: boolean;
  isSanctioned?: boolean;
  nationality?: string;
  countryOfResidence?: string;
  submittedAt?: string;
  approvedAt?: string;
  expiresAt?: string;
  rejectionReason?: string;
}

interface FormState {
  fullName: string;
  dob: string;
  nationality: string;
  countryOfResidence: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  idDocumentType: "passport" | "drivers_license" | "national_id" | "residence_permit";
  idIssuingCountry: string;
  idNumber: string;
  idExpiry: string;
  isPep: boolean;
  sourceOfFunds: string;
  expectedMonthlyVolume: string;
}

const EMPTY: FormState = {
  fullName: "",
  dob: "",
  nationality: "",
  countryOfResidence: "",
  addressLine1: "",
  city: "",
  postalCode: "",
  idDocumentType: "passport",
  idIssuingCountry: "",
  idNumber: "",
  idExpiry: "",
  isPep: false,
  sourceOfFunds: "",
  expectedMonthlyVolume: "",
};

export default function KycPage() {
  const router = useRouter();
  const { status } = useSession();
  const [countries, setCountries] = useState<CountryEntry[]>([]);
  const [currentCase, setCurrentCase] = useState<KycCaseSummary | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin?next=/kyc");
  }, [status, router]);

  useEffect(() => {
    Promise.all([
      fetch("/api/banking/countries").then((r) => r.json()),
      fetch("/api/kyc/submit").then((r) => r.json()),
    ])
      .then(([countryRes, caseRes]) => {
        if (countryRes.success) setCountries(countryRes.countries);
        if (caseRes.success) setCurrentCase(caseRes.case);
      })
      .finally(() => setLoaded(true));
  }, []);

  const sortedCountries = useMemo(
    () => [...countries].sort((a, b) => a.name.localeCompare(b.name)),
    [countries]
  );

  function update<K extends keyof FormState>(k: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [k]: val }));
    setFieldErrors((errs) => ({ ...errs, [k]: "" }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await fetch("/api/kyc/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.errors) setFieldErrors(data.errors);
        setError(data.error || "Submission failed");
      } else {
        setCurrentCase(data.case);
      }
    } catch (err: any) {
      setError(err?.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded || status === "loading") {
    return (
      <>
        <Header />
        <Sidebar />
        <main className={styles.page}>
          <div className={styles.loading}>Loading…</div>
        </main>
        <Footer />
      </>
    );
  }

  // Existing-case view
  if (currentCase && currentCase.status !== "not_started" && currentCase.status !== "rejected" && currentCase.status !== "expired") {
    return (
      <>
        <Header />
        <Sidebar />
        <main className={styles.page}>
          <header className={styles.head}>
            <h1>Identity Verification</h1>
            <p className={styles.muted}>Your KYC case is in progress.</p>
          </header>
          <div className={styles.card}>
            <dl className={styles.summary}>
              <div><dt>Status</dt><dd className={`${styles.statusPill} ${styles[`status_${currentCase.status}`]}`}>{currentCase.status.replace(/_/g, " ")}</dd></div>
              <div><dt>Tier</dt><dd>{currentCase.level}</dd></div>
              {currentCase.submittedAt && <div><dt>Submitted</dt><dd>{new Date(currentCase.submittedAt).toLocaleString()}</dd></div>}
              {currentCase.approvedAt && <div><dt>Approved</dt><dd>{new Date(currentCase.approvedAt).toLocaleString()}</dd></div>}
              {currentCase.expiresAt && <div><dt>Renews by</dt><dd>{new Date(currentCase.expiresAt).toLocaleDateString()}</dd></div>}
              {currentCase.nationality && <div><dt>Nationality</dt><dd>{currentCase.nationality}</dd></div>}
              {currentCase.countryOfResidence && <div><dt>Residence</dt><dd>{currentCase.countryOfResidence}</dd></div>}
              {currentCase.isPep && <div><dt>PEP</dt><dd>Yes (under review)</dd></div>}
            </dl>
            <p className={styles.muted}>
              If your case is in <code>documents_pending</code> or <code>in_review</code>, our compliance team
              will reach out by email if anything else is needed.
            </p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <Sidebar />
      <main className={styles.page}>
        <header className={styles.head}>
          <h1>Identity Verification</h1>
          <p className={styles.muted}>
            Required to unlock external transfers, wires, and international payments.
            Information is encrypted at rest and shared only with our compliance team.
          </p>
        </header>

        {currentCase?.status === "rejected" && currentCase.rejectionReason && (
          <div className={styles.error}>
            <strong>Previous submission rejected:</strong> {currentCase.rejectionReason}
          </div>
        )}
        {currentCase?.status === "expired" && (
          <div className={styles.warning}>
            Your previous verification has expired. Please re-submit to restore access.
          </div>
        )}

        <form onSubmit={submit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <fieldset className={styles.section}>
            <legend>Personal information</legend>
            <label className={styles.field}>
              <span>Full legal name</span>
              <input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required maxLength={200} />
              {fieldErrors.fullName && <small className={styles.fieldError}>{fieldErrors.fullName}</small>}
            </label>
            <div className={styles.row}>
              <label className={styles.field}>
                <span>Date of birth</span>
                <input type="date" value={form.dob} onChange={(e) => update("dob", e.target.value)} required />
                {fieldErrors.dob && <small className={styles.fieldError}>{fieldErrors.dob}</small>}
              </label>
              <label className={styles.field}>
                <span>Nationality</span>
                <select value={form.nationality} onChange={(e) => update("nationality", e.target.value)} required>
                  <option value="">— select —</option>
                  {sortedCountries.map((c) => (
                    <option key={c.iso2} value={c.iso2}>{c.name}</option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset className={styles.section}>
            <legend>Residential address</legend>
            <label className={styles.field}>
              <span>Country of residence</span>
              <select value={form.countryOfResidence} onChange={(e) => update("countryOfResidence", e.target.value)} required>
                <option value="">— select —</option>
                {sortedCountries.filter((c) => c.selectable).map((c) => (
                  <option key={c.iso2} value={c.iso2}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Address line</span>
              <input value={form.addressLine1} onChange={(e) => update("addressLine1", e.target.value)} required maxLength={500} />
            </label>
            <div className={styles.row}>
              <label className={styles.field}>
                <span>City</span>
                <input value={form.city} onChange={(e) => update("city", e.target.value)} required maxLength={200} />
              </label>
              <label className={styles.field}>
                <span>Postal / ZIP code</span>
                <input value={form.postalCode} onChange={(e) => update("postalCode", e.target.value)} required maxLength={30} />
              </label>
            </div>
          </fieldset>

          <fieldset className={styles.section}>
            <legend>Government-issued ID</legend>
            <div className={styles.row}>
              <label className={styles.field}>
                <span>Document type</span>
                <select value={form.idDocumentType} onChange={(e) => update("idDocumentType", e.target.value as FormState["idDocumentType"])}>
                  <option value="passport">Passport</option>
                  <option value="drivers_license">Driver's License</option>
                  <option value="national_id">National ID</option>
                  <option value="residence_permit">Residence Permit</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Issuing country</span>
                <select value={form.idIssuingCountry} onChange={(e) => update("idIssuingCountry", e.target.value)} required>
                  <option value="">— select —</option>
                  {sortedCountries.map((c) => (
                    <option key={c.iso2} value={c.iso2}>{c.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className={styles.row}>
              <label className={styles.field}>
                <span>Document number</span>
                <input value={form.idNumber} onChange={(e) => update("idNumber", e.target.value)} required maxLength={60} />
              </label>
              <label className={styles.field}>
                <span>Expiry date</span>
                <input type="date" value={form.idExpiry} onChange={(e) => update("idExpiry", e.target.value)} required />
              </label>
            </div>
          </fieldset>

          <fieldset className={styles.section}>
            <legend>Source of funds & risk</legend>
            <label className={styles.field}>
              <span>Primary source of funds</span>
              <select value={form.sourceOfFunds} onChange={(e) => update("sourceOfFunds", e.target.value)} required>
                <option value="">— select —</option>
                <option>Salary / employment</option>
                <option>Business income</option>
                <option>Investment proceeds</option>
                <option>Sale of property</option>
                <option>Inheritance</option>
                <option>Pension / retirement</option>
                <option>Other</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>Expected monthly volume (USD)</span>
              <input
                value={form.expectedMonthlyVolume}
                onChange={(e) => update("expectedMonthlyVolume", e.target.value)}
                placeholder="0.00"
                inputMode="decimal"
              />
            </label>
            <label className={styles.checkbox}>
              <input type="checkbox" checked={form.isPep} onChange={(e) => update("isPep", e.target.checked)} />
              <span>
                I am, or have been in the last 12 months, a Politically Exposed Person (PEP) — that is,
                someone holding a prominent public office, or an immediate family member or close
                associate of such a person.
              </span>
            </label>
          </fieldset>

          <div className={styles.submitRow}>
            <button type="submit" className={styles.primary} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit for verification"}
            </button>
          </div>
        </form>
      </main>
      <Footer />
    </>
  );
}
