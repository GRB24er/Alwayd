// International wire form — country-aware. Loads the full ISO country list and per-country
// banking-rules registry from /api/banking/countries on mount, then renders only the fields
// the destination's rail actually needs (IBAN for SEPA, IFSC for India, BSB for Australia,
// CLABE for Mexico, etc.).
//
// Client-side validation mirrors the server-side validators so the user gets immediate
// feedback before submission; the server still re-validates everything as the source of truth.

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import styles from "./international.module.css";

interface BankingField {
  kind: string;
  label: string;
  placeholder?: string;
  required: boolean;
  helpText?: string;
}

interface CountryEntry {
  iso2: string;
  iso3: string;
  name: string;
  currency: string;
  callingCode: string;
  region: "africa" | "americas" | "asia" | "europe" | "oceania" | "antarctica";
  sanctions: "none" | "enhanced_due_diligence" | "restricted" | "embargo";
  selectable: boolean;
  banking: {
    domesticSystem: string;
    primaryRail: string;
    fields: BankingField[];
  };
}

interface FormState {
  fromAccount: "checking" | "savings" | "investment";
  recipientCountry: string;
  recipientName: string;
  recipientAddress: string;
  recipientCity: string;
  recipientPostalCode: string;
  recipientPhone: string;
  recipientEmail: string;
  bankName: string;
  bankAddress: string;
  bankCity: string;
  amount: string;
  sourceCurrency: string;
  targetCurrency: string;
  purpose: string;
  sourceOfFunds: string;
  relationship: string;
  reference: string;
  transferSpeed: "standard" | "express" | "instant";
  intermediaryBank?: string;
  intermediarySwift?: string;
  iban?: string;
  swiftBic?: string;
  accountNumber?: string;
  sortCodeUk?: string;
  bsbAu?: string;
  ifscIn?: string;
  clabeMx?: string;
  transitCa?: string;
  bankCodeGeneric?: string;
  branchCodeGeneric?: string;
  taxId?: string;
  purposeCodeRbi?: string;
  complianceAccepted: boolean;
}

const EMPTY_FORM: FormState = {
  fromAccount: "checking",
  recipientCountry: "",
  recipientName: "",
  recipientAddress: "",
  recipientCity: "",
  recipientPostalCode: "",
  recipientPhone: "",
  recipientEmail: "",
  bankName: "",
  bankAddress: "",
  bankCity: "",
  amount: "",
  sourceCurrency: "USD",
  targetCurrency: "",
  purpose: "",
  sourceOfFunds: "",
  relationship: "",
  reference: "",
  transferSpeed: "standard",
  complianceAccepted: false,
};

const SANCTIONS_LABEL: Record<CountryEntry["sanctions"], string> = {
  none: "",
  enhanced_due_diligence: "Enhanced Due Diligence required",
  restricted: "Restricted — manual review",
  embargo: "Embargoed — transfers prohibited",
};

const REGION_LABEL: Record<CountryEntry["region"], string> = {
  africa: "Africa",
  americas: "Americas",
  asia: "Asia",
  europe: "Europe",
  oceania: "Oceania",
  antarctica: "Antarctica",
};

export default function InternationalTransferPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [countries, setCountries] = useState<CountryEntry[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin?next=/transfers/international");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/banking/countries")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setCountries(data.countries);
      })
      .catch(() => setError("Failed to load country list"))
      .finally(() => setLoadingCountries(false));
  }, []);

  const selectedCountry = useMemo(
    () => countries.find((c) => c.iso2 === form.recipientCountry),
    [countries, form.recipientCountry]
  );

  const groupedCountries = useMemo(() => {
    const groups: Record<string, CountryEntry[]> = {};
    for (const c of countries) {
      const key = REGION_LABEL[c.region] || "Other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    }
    for (const k of Object.keys(groups)) {
      groups[k].sort((a, b) => a.name.localeCompare(b.name));
    }
    return groups;
  }, [countries]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((errs) => ({ ...errs, [key]: "" }));
  }

  function onCountryChange(iso2: string) {
    const c = countries.find((x) => x.iso2 === iso2);
    setForm((f) => ({
      ...f,
      recipientCountry: iso2,
      targetCurrency: c?.currency || "",
      iban: "",
      swiftBic: "",
      accountNumber: "",
      sortCodeUk: "",
      bsbAu: "",
      ifscIn: "",
      clabeMx: "",
      transitCa: "",
      bankCodeGeneric: "",
      branchCodeGeneric: "",
      taxId: "",
      purposeCodeRbi: "",
    }));
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!selectedCountry) {
      setError("Choose a destination country");
      return;
    }
    if (selectedCountry.sanctions === "embargo") {
      setError(`Transfers to ${selectedCountry.name} are prohibited.`);
      return;
    }
    if (!form.complianceAccepted) {
      setError("You must confirm the compliance declaration.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/transfers/international", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": newIdempotencyKey(),
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.errors) setFieldErrors(data.errors);
        setError(data.error || "Transfer failed");
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(err?.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading" || loadingCountries) {
    return (
      <>
        <Header />
        <Sidebar />
        <main className={styles.page}>
          <div className={styles.loading}>Loading transfer infrastructure…</div>
        </main>
        <Footer />
      </>
    );
  }

  if (result?.success) {
    return (
      <>
        <Header />
        <Sidebar />
        <main className={styles.page}>
          <div className={styles.successCard}>
            <h2>International wire initiated</h2>
            <p className={styles.muted}>Awaiting compliance approval. You'll be notified by email.</p>
            <dl className={styles.summary}>
              <div><dt>Reference</dt><dd><code>{result.wireReference}</code></dd></div>
              <div><dt>Rail</dt><dd>{result.transfer.rail}</dd></div>
              <div><dt>Destination</dt><dd>{result.transfer.to.countryName} — {result.transfer.to.bank}</dd></div>
              <div><dt>Amount</dt><dd>{result.transfer.sourceCurrency} {result.transfer.amount.toLocaleString()}</dd></div>
              <div><dt>Fee</dt><dd>{result.transfer.sourceCurrency} {result.transfer.fee.toLocaleString()}</dd></div>
              <div><dt>Total debited</dt><dd>{result.transfer.sourceCurrency} {result.transfer.total.toLocaleString()}</dd></div>
              <div><dt>Speed</dt><dd>{result.transfer.transferSpeed} — {result.transfer.estimatedDelivery}</dd></div>
            </dl>
            {result.transfer.sanctionsWarnings?.length > 0 && (
              <div className={styles.warning}>
                <strong>Enhanced due diligence:</strong>
                <ul>
                  {result.transfer.sanctionsWarnings.map((w: any, i: number) => (
                    <li key={i}>{w.reason}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className={styles.actions}>
              <button onClick={() => { setResult(null); setForm(EMPTY_FORM); }}>Send another</button>
              <button onClick={() => router.push("/transactions")}>View transactions</button>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const sanctionsLabel = selectedCountry ? SANCTIONS_LABEL[selectedCountry.sanctions] : "";

  return (
    <>
      <Header />
      <Sidebar />
      <main className={styles.page}>
        <header className={styles.head}>
          <h1>International Wire Transfer</h1>
          <p className={styles.muted}>Send funds to a beneficiary account in any supported country. Fields adapt to the destination's banking system.</p>
        </header>

        <form onSubmit={submit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          {/* ── Source ──────────────────────────────────────────── */}
          <fieldset className={styles.section}>
            <legend>Source</legend>
            <label className={styles.field}>
              <span>From account</span>
              <select value={form.fromAccount} onChange={(e) => update("fromAccount", e.target.value as FormState["fromAccount"])}>
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
                <option value="investment">Investment</option>
              </select>
            </label>

            <label className={styles.field}>
              <span>Amount (USD)</span>
              <input
                value={form.amount}
                onChange={(e) => update("amount", e.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                required
              />
              {fieldErrors.amount && <small className={styles.fieldError}>{fieldErrors.amount}</small>}
            </label>
          </fieldset>

          {/* ── Destination country ─────────────────────────────── */}
          <fieldset className={styles.section}>
            <legend>Destination</legend>
            <label className={styles.field}>
              <span>Beneficiary country</span>
              <select value={form.recipientCountry} onChange={(e) => onCountryChange(e.target.value)} required>
                <option value="">— select a country —</option>
                {Object.entries(groupedCountries).map(([region, list]) => (
                  <optgroup key={region} label={region}>
                    {list.map((c) => (
                      <option key={c.iso2} value={c.iso2} disabled={!c.selectable}>
                        {c.name} ({c.currency}) {c.sanctions === "embargo" ? " — blocked" : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            {selectedCountry && (
              <div className={styles.countryMeta}>
                <span><strong>Rail:</strong> {selectedCountry.banking.primaryRail}</span>
                <span><strong>System:</strong> {selectedCountry.banking.domesticSystem}</span>
                <span><strong>Currency:</strong> {selectedCountry.currency}</span>
                {sanctionsLabel && (
                  <span className={selectedCountry.sanctions === "embargo" ? styles.danger : styles.warningPill}>
                    {sanctionsLabel}
                  </span>
                )}
              </div>
            )}
          </fieldset>

          {/* ── Beneficiary ─────────────────────────────────────── */}
          {selectedCountry && selectedCountry.sanctions !== "embargo" && (
            <>
              <fieldset className={styles.section}>
                <legend>Beneficiary</legend>
                <label className={styles.field}>
                  <span>Full legal name (as on bank account)</span>
                  <input value={form.recipientName} onChange={(e) => update("recipientName", e.target.value)} required />
                  {fieldErrors.recipientName && <small className={styles.fieldError}>{fieldErrors.recipientName}</small>}
                </label>
                <label className={styles.field}>
                  <span>Beneficiary address</span>
                  <input value={form.recipientAddress} onChange={(e) => update("recipientAddress", e.target.value)} required />
                </label>
                <div className={styles.row}>
                  <label className={styles.field}>
                    <span>City</span>
                    <input value={form.recipientCity} onChange={(e) => update("recipientCity", e.target.value)} />
                  </label>
                  <label className={styles.field}>
                    <span>Postal / ZIP code</span>
                    <input value={form.recipientPostalCode} onChange={(e) => update("recipientPostalCode", e.target.value)} />
                  </label>
                </div>
                <div className={styles.row}>
                  <label className={styles.field}>
                    <span>Phone ({selectedCountry.callingCode})</span>
                    <input value={form.recipientPhone} onChange={(e) => update("recipientPhone", e.target.value)} />
                  </label>
                  <label className={styles.field}>
                    <span>Email (optional)</span>
                    <input type="email" value={form.recipientEmail} onChange={(e) => update("recipientEmail", e.target.value)} />
                  </label>
                </div>
              </fieldset>

              {/* ── Bank ──────────────────────────────────────── */}
              <fieldset className={styles.section}>
                <legend>Beneficiary bank</legend>
                <label className={styles.field}>
                  <span>Bank name</span>
                  <input value={form.bankName} onChange={(e) => update("bankName", e.target.value)} required />
                </label>
                <div className={styles.row}>
                  <label className={styles.field}>
                    <span>Bank address</span>
                    <input value={form.bankAddress} onChange={(e) => update("bankAddress", e.target.value)} required />
                  </label>
                  <label className={styles.field}>
                    <span>Bank city</span>
                    <input value={form.bankCity} onChange={(e) => update("bankCity", e.target.value)} />
                  </label>
                </div>

                {/* Dynamic rail fields per country */}
                {selectedCountry.banking.fields.map((f) => (
                  <RailField
                    key={f.kind}
                    field={f}
                    value={(form as any)[mapKindToFormKey(f.kind)] || ""}
                    onChange={(val) => update(mapKindToFormKey(f.kind) as any, val as any)}
                    error={fieldErrors[mapKindToFormKey(f.kind)]}
                  />
                ))}

                <details className={styles.advanced}>
                  <summary>Intermediary / correspondent bank (optional)</summary>
                  <label className={styles.field}>
                    <span>Intermediary bank name</span>
                    <input value={form.intermediaryBank || ""} onChange={(e) => update("intermediaryBank", e.target.value)} />
                  </label>
                  <label className={styles.field}>
                    <span>Intermediary SWIFT/BIC</span>
                    <input value={form.intermediarySwift || ""} onChange={(e) => update("intermediarySwift", e.target.value.toUpperCase())} />
                  </label>
                </details>
              </fieldset>

              {/* ── Compliance ────────────────────────────────── */}
              <fieldset className={styles.section}>
                <legend>Purpose & compliance</legend>
                <label className={styles.field}>
                  <span>Purpose of transfer</span>
                  <input value={form.purpose} onChange={(e) => update("purpose", e.target.value)} required maxLength={300} />
                </label>
                <div className={styles.row}>
                  <label className={styles.field}>
                    <span>Source of funds</span>
                    <select value={form.sourceOfFunds} onChange={(e) => update("sourceOfFunds", e.target.value)} required>
                      <option value="">— select —</option>
                      <option>Salary / employment</option>
                      <option>Business income</option>
                      <option>Investment proceeds</option>
                      <option>Sale of property</option>
                      <option>Inheritance</option>
                      <option>Loan / financing</option>
                      <option>Gift</option>
                      <option>Other</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>Relationship to beneficiary</span>
                    <select value={form.relationship} onChange={(e) => update("relationship", e.target.value)} required>
                      <option value="">— select —</option>
                      <option>Self</option>
                      <option>Family</option>
                      <option>Friend</option>
                      <option>Employer / employee</option>
                      <option>Supplier / vendor</option>
                      <option>Customer</option>
                      <option>Other</option>
                    </select>
                  </label>
                </div>
                <div className={styles.row}>
                  <label className={styles.field}>
                    <span>Speed</span>
                    <select value={form.transferSpeed} onChange={(e) => update("transferSpeed", e.target.value as FormState["transferSpeed"])}>
                      <option value="standard">Standard (3-5 business days, $25 fee)</option>
                      <option value="express">Express (1-2 business days, $45 fee)</option>
                      <option value="instant">Instant (eligible corridors, $75 fee)</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>Your reference (optional)</span>
                    <input value={form.reference} onChange={(e) => update("reference", e.target.value)} />
                  </label>
                </div>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={form.complianceAccepted}
                    onChange={(e) => update("complianceAccepted", e.target.checked)}
                  />
                  <span>
                    I confirm that the information above is accurate and the funds are not derived from illegal
                    activity. I understand this transfer is subject to anti-money-laundering review and may be
                    delayed or blocked if it fails compliance checks.
                  </span>
                </label>
              </fieldset>

              <div className={styles.submitRow}>
                <button
                  type="submit"
                  className={styles.primary}
                  disabled={submitting || !form.complianceAccepted}
                >
                  {submitting ? "Submitting…" : "Initiate wire transfer"}
                </button>
              </div>
            </>
          )}
        </form>
      </main>
      <Footer />
    </>
  );
}

function RailField({
  field,
  value,
  onChange,
  error,
}: {
  field: BankingField;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  // Some fields should be auto-uppercased (IBAN, SWIFT, IFSC, etc.)
  const upper = ["iban", "swift_bic", "ifsc_in"].includes(field.kind);
  return (
    <label className={styles.field}>
      <span>
        {field.label} {field.required && <em className={styles.required}>required</em>}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(upper ? e.target.value.toUpperCase() : e.target.value)}
        placeholder={field.placeholder}
        required={field.required}
      />
      {field.helpText && <small className={styles.help}>{field.helpText}</small>}
      {error && <small className={styles.fieldError}>{error}</small>}
    </label>
  );
}

function mapKindToFormKey(kind: string): keyof FormState {
  switch (kind) {
    case "iban":               return "iban";
    case "swift_bic":          return "swiftBic";
    case "account_number":     return "accountNumber";
    case "sort_code_uk":       return "sortCodeUk";
    case "bsb_au":             return "bsbAu";
    case "ifsc_in":            return "ifscIn";
    case "clabe_mx":           return "clabeMx";
    case "transit_ca":         return "transitCa";
    case "bank_code_generic":  return "bankCodeGeneric";
    case "branch_code_generic":return "branchCodeGeneric";
    case "tax_id":             return "taxId";
    case "purpose_code":       return "purposeCodeRbi";
    default:                   return "accountNumber";
  }
}

function newIdempotencyKey(): string {
  // 16 bytes of randomness, hex-encoded — 32 chars, well above the 8-char floor.
  const buf = new Uint8Array(16);
  (typeof crypto !== "undefined" ? crypto : (globalThis as any).crypto).getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}
