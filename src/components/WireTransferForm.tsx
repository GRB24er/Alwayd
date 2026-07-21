// Shared multi-step transfer form used by both /transfers/wire (domestic FedWire)
// and /transfers/international (worldwide). Renders the canonical Aldwych
// banking brand: navy hero, gold progress bar, step wizard with formGrid
// fields. For international mode, dynamically renders the rail fields required
// by the destination country (IBAN for SEPA, IFSC for India, BSB for Australia,
// CLABE for Mexico, sort code for UK, etc.) based on /api/banking/countries.

"use client";
import { useDisplayCurrency } from "@/lib/useDisplayCurrency";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import styles from "./WireTransferForm.module.css";

export type WireMode = "domestic" | "international";

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

  // Destination
  recipientCountry: string;
  recipientName: string;
  recipientAddress: string;
  recipientCity: string;
  recipientPostalCode: string;
  recipientPhone: string;
  recipientEmail: string;

  // Bank
  bankName: string;
  bankAddress: string;
  bankCity: string;

  // Money
  amount: string;
  sourceCurrency: string;
  targetCurrency: string;

  // Per-country rail fields
  iban: string;
  swiftBic: string;
  accountNumber: string;
  sortCodeUk: string;
  bsbAu: string;
  ifscIn: string;
  clabeMx: string;
  transitCa: string;
  bankCodeGeneric: string;
  branchCodeGeneric: string;
  taxId: string;
  purposeCodeRbi: string;
  routingNumberAba: string;

  // Compliance
  purpose: string;
  sourceOfFunds: string;
  relationship: string;
  reference: string;
  transferSpeed: "standard" | "express" | "instant" | "wire";
  urgentTransfer: boolean;
  intermediaryBank: string;
  intermediarySwift: string;
  complianceAccepted: boolean;
}

const EMPTY: FormState = {
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
  routingNumberAba: "",
  purpose: "",
  sourceOfFunds: "",
  relationship: "",
  reference: "",
  transferSpeed: "standard",
  urgentTransfer: false,
  intermediaryBank: "",
  intermediarySwift: "",
  complianceAccepted: false,
};

const REGION_LABEL: Record<CountryEntry["region"], string> = {
  africa: "Africa",
  americas: "Americas",
  asia: "Asia",
  europe: "Europe",
  oceania: "Oceania",
  antarctica: "Antarctica",
};

const SANCTIONS_LABEL: Record<CountryEntry["sanctions"], string> = {
  none: "",
  enhanced_due_diligence: "Enhanced Due Diligence required",
  restricted: "Restricted — manual review",
  embargo: "Embargoed — transfers prohibited",
};

const TRANSFER_SPEEDS_INTL = [
  { id: "standard", name: "Standard", time: "3-5 business days", fee: 25, description: "Most economical" },
  { id: "express", name: "Express", time: "1-2 business days", fee: 45, description: "Faster delivery" },
  { id: "instant", name: "Instant", time: "Within minutes (eligible corridors)", fee: 75, description: "Immediate" },
] as const;

const TRANSFER_SPEEDS_DOM = [
  { id: "standard", name: "FedWire Standard", time: "Within hours", fee: 30, description: "Same business day" },
] as const;

export default function WireTransferForm({ mode }: { mode: WireMode }) {
  const { format } = useDisplayCurrency();
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const [countries, setCountries] = useState<CountryEntry[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [form, setForm] = useState<FormState>(() =>
    mode === "domestic" ? { ...EMPTY, recipientCountry: "US" } : EMPTY
  );
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // The wire (domestic) flow is one fewer step because country is fixed to US.
  const totalSteps = mode === "domestic" ? 4 : 5;

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push(`/auth/signin?next=/transfers/${mode === "domestic" ? "wire" : "international"}`);
    }
  }, [sessionStatus, router, mode]);

  useEffect(() => {
    fetch("/api/banking/countries")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setCountries(data.countries);
      })
      .catch(() => setError("Failed to load country registry"))
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
      (groups[key] = groups[key] || []).push(c);
    }
    for (const k of Object.keys(groups)) {
      groups[k].sort((a, b) => a.name.localeCompare(b.name));
    }
    return groups;
  }, [countries]);

  // Auto-set target currency when country changes (international only).
  useEffect(() => {
    if (mode === "international" && selectedCountry && !form.targetCurrency) {
      setForm((f) => ({ ...f, targetCurrency: selectedCountry.currency }));
    }
  }, [mode, selectedCountry]); // eslint-disable-line react-hooks/exhaustive-deps

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((errs) => ({ ...errs, [String(key)]: "" }));
  }

  function onCountryChange(iso2: string) {
    setForm((f) => ({
      ...f,
      recipientCountry: iso2,
      targetCurrency: "",
      iban: "", swiftBic: "", accountNumber: "",
      sortCodeUk: "", bsbAu: "", ifscIn: "", clabeMx: "",
      transitCa: "", bankCodeGeneric: "", branchCodeGeneric: "",
      taxId: "", purposeCodeRbi: "", routingNumberAba: "",
    }));
    setFieldErrors({});
  }

  // Per-step validation gate before allowing Next.
  function canAdvance(): boolean {
    if (mode === "international") {
      if (step === 1) return !!form.fromAccount && !!form.amount && Number(form.amount) > 0;
      if (step === 2) return !!selectedCountry && selectedCountry.sanctions !== "embargo";
      if (step === 3) return !!form.recipientName.trim() && !!form.recipientAddress.trim();
      if (step === 4) return !!form.bankName.trim() && railFieldsComplete();
      if (step === 5) return !!form.purpose && !!form.sourceOfFunds && !!form.relationship && form.complianceAccepted;
    } else {
      if (step === 1) return !!form.fromAccount && !!form.amount && Number(form.amount) >= 100;
      if (step === 2) return !!form.recipientName.trim() && !!form.recipientAddress.trim();
      if (step === 3) return !!form.bankName.trim() && /^\d{9}$/.test(form.routingNumberAba || "") && !!form.accountNumber.trim();
      if (step === 4) return !!form.purpose && form.complianceAccepted;
    }
    return false;
  }

  function railFieldsComplete(): boolean {
    if (!selectedCountry) return false;
    for (const f of selectedCountry.banking.fields) {
      if (!f.required) continue;
      const k = mapKindToFormKey(f.kind);
      if (!form[k]) return false;
    }
    return true;
  }

  async function submit() {
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    const endpoint = mode === "domestic" ? "/api/transfers/wire" : "/api/transfers/international";
    const idempotencyKey = newIdempotencyKey();

    const payload =
      mode === "domestic"
        ? {
            fromAccount: form.fromAccount,
            recipientName: form.recipientName,
            recipientAccount: form.accountNumber,
            recipientBank: form.bankName,
            recipientRoutingNumber: form.routingNumberAba,
            recipientBankAddress: form.bankAddress || `${form.bankName} Main Branch`,
            recipientAddress: `${form.recipientAddress}, ${form.recipientCity || ""} ${form.recipientPostalCode || ""}, US`.trim(),
            amount: String(form.amount),
            description: form.reference || `Wire transfer to ${form.recipientName}`,
            wireType: "domestic",
            purposeOfTransfer: form.purpose,
            urgentTransfer: form.urgentTransfer,
          }
        : { ...form, amount: String(form.amount) };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(payload),
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

  const speedOptions = mode === "international" ? TRANSFER_SPEEDS_INTL : TRANSFER_SPEEDS_DOM;
  const fee = useMemo(() => {
    const speed = speedOptions.find((s) => s.id === form.transferSpeed) || speedOptions[0];
    let f = speed.fee;
    if (mode === "international" && selectedCountry?.sanctions === "enhanced_due_diligence") f += 15;
    if (mode === "domestic" && form.urgentTransfer) f += 25;
    return f;
  }, [form.transferSpeed, form.urgentTransfer, selectedCountry, mode, speedOptions]);

  const amountNumber = Number(form.amount || 0);
  const total = amountNumber + fee;

  if (sessionStatus === "loading" || loadingCountries) {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <div className={styles.mainContent}>
          <Header />
          <div className={styles.loadingScreen}>
            <div className={styles.loadingSpinner} />
            <p>Loading transfer infrastructure…</p>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  // ── Success view ─────────────────────────────────────────────────────────
  if (result?.success) {
    const t = result.transfer || {};
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <div className={styles.mainContent}>
          <Header />
          <main className={styles.successScreen}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={styles.successCard}
            >
              <div className={styles.successIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="56" height="56">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h1>Transfer initiated</h1>
              <p className={styles.successSub}>
                {mode === "domestic"
                  ? "Your domestic wire has been submitted for compliance review."
                  : `Your international wire to ${t.to?.countryName || "the destination"} has been submitted.`}
              </p>

              <div className={styles.reviewContainer}>
                <div className={styles.reviewSection}>
                  <h3>Transfer Reference</h3>
                  <div className={styles.referenceBox}>
                    <code>{result.wireReference || result.transferReference}</code>
                  </div>
                </div>

                <div className={styles.reviewSection}>
                  <h3>Summary</h3>
                  <div className={styles.reviewGrid}>
                    <div className={styles.reviewItem}>
                      <span className={styles.reviewLabel}>Rail</span>
                      <span className={styles.reviewValue}>{t.rail || (mode === "domestic" ? "FedWire" : "SWIFT")}</span>
                    </div>
                    <div className={styles.reviewItem}>
                      <span className={styles.reviewLabel}>Beneficiary</span>
                      <span className={styles.reviewValue}>{t.to?.name || form.recipientName}</span>
                    </div>
                    <div className={styles.reviewItem}>
                      <span className={styles.reviewLabel}>Bank</span>
                      <span className={styles.reviewValue}>{t.to?.bank || form.bankName}</span>
                    </div>
                    <div className={styles.reviewItem}>
                      <span className={styles.reviewLabel}>Amount</span>
                      <span className={styles.reviewValue}>{format(Number(t.amount || form.amount))}</span>
                    </div>
                    <div className={styles.reviewItem}>
                      <span className={styles.reviewLabel}>Fee</span>
                      <span className={styles.reviewValue}>{format(t.fee || fee)}</span>
                    </div>
                    <div className={styles.reviewItem}>
                      <span className={styles.reviewLabel}>Total debited</span>
                      <span className={styles.reviewValue}><strong>{format(Number(t.total || total))}</strong></span>
                    </div>
                    <div className={styles.reviewItem}>
                      <span className={styles.reviewLabel}>Estimated delivery</span>
                      <span className={styles.reviewValue}>{t.estimatedDelivery || "1-2 business days"}</span>
                    </div>
                  </div>
                </div>

                {t.sanctionsWarnings && t.sanctionsWarnings.length > 0 && (
                  <div className={styles.warningBox}>
                    <div className={styles.warningContent}>
                      <strong>Enhanced due diligence applies</strong>
                      <ul>{t.sanctionsWarnings.map((w: any, i: number) => <li key={i}>{w.reason}</li>)}</ul>
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.formActions}>
                <button className={styles.btnSecondary} onClick={() => router.push("/transactions")}>
                  View transactions
                </button>
                <button
                  className={styles.btnPrimary}
                  onClick={() => { setResult(null); setForm(mode === "domestic" ? { ...EMPTY, recipientCountry: "US" } : EMPTY); setStep(1); }}
                >
                  Send another
                </button>
              </div>
            </motion.div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  // ── Main form ────────────────────────────────────────────────────────────
  const progress = (step / totalSteps) * 100;

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.mainContent}>
        <Header />

        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              {mode === "domestic" ? "Domestic Wire Transfer" : "International Wire Transfer"}
            </h1>
            <p className={styles.heroSubtitle}>
              {mode === "domestic"
                ? "Send funds via FedWire to any US financial institution"
                : "Send funds to beneficiaries in any supported country worldwide"}
            </p>
          </div>

          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>

          <div className={styles.steps}>
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => {
              const labels = mode === "international"
                ? ["Amount", "Country", "Beneficiary", "Bank", "Compliance"]
                : ["Amount", "Beneficiary", "Bank", "Compliance"];
              const active = step === n;
              const done = step > n;
              return (
                <div
                  key={n}
                  className={`${styles.step} ${active ? styles.active : ""} ${done ? styles.completed : ""}`}
                  onClick={() => done && setStep(n)}
                >
                  <div className={styles.stepNumber}>{done ? "✓" : n}</div>
                  <div className={styles.stepLabel}>{labels[n - 1]}</div>
                </div>
              );
            })}
          </div>
        </section>

        <main className={styles.container}>
          <div className={styles.formContainer}>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className={styles.stepContent}
              >
                {error && <div className={styles.errorBanner}>{error}</div>}

                {/* ── Step 1: Amount + Source ───────────────────────────── */}
                {step === 1 && (
                  <>
                    <h2 className={styles.stepTitle}>Source &amp; amount</h2>

                    <div className={styles.formGrid}>
                      <div className={styles.formField}>
                        <label>From account <span className={styles.required}>*</span></label>
                        <select
                          value={form.fromAccount}
                          onChange={(e) => update("fromAccount", e.target.value as FormState["fromAccount"])}
                        >
                          <option value="checking">Checking</option>
                          <option value="savings">Savings</option>
                          <option value="investment">Investment</option>
                        </select>
                      </div>

                      <div className={styles.formField}>
                        <label>Amount (USD) <span className={styles.required}>*</span></label>
                        <div className={styles.amountInput}>
                          <span className={styles.currencyPrefix}>$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={form.amount}
                            onChange={(e) => update("amount", e.target.value.replace(/[^0-9.]/g, ""))}
                            placeholder="0.00"
                            className={fieldErrors.amount ? styles.errorInput : ""}
                          />
                        </div>
                        {fieldErrors.amount && <div className={styles.errorMessage}>{fieldErrors.amount}</div>}
                      </div>
                    </div>

                    <div className={styles.formSection}>
                      <label className={styles.sectionLabel}>Transfer speed</label>
                      <div className={styles.speedGrid}>
                        {speedOptions.map((s) => (
                          <label
                            key={s.id}
                            className={`${styles.speedOption} ${form.transferSpeed === s.id ? styles.speedSelected : ""}`}
                          >
                            <input
                              type="radio"
                              name="speed"
                              value={s.id}
                              checked={form.transferSpeed === s.id}
                              onChange={() => update("transferSpeed", s.id as FormState["transferSpeed"])}
                            />
                            <div className={styles.speedInner}>
                              <div className={styles.speedName}>{s.name}</div>
                              <div className={styles.speedTime}>{s.time}</div>
                              <div className={styles.speedFee}>Fee: ${s.fee}</div>
                              <div className={styles.speedDesc}>{s.description}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {mode === "domestic" && (
                      <div className={styles.checkboxField}>
                        <input
                          type="checkbox"
                          id="urgent"
                          checked={form.urgentTransfer}
                          onChange={(e) => update("urgentTransfer", e.target.checked)}
                        />
                        <label htmlFor="urgent">Urgent processing (+$25 fee)</label>
                      </div>
                    )}

                    <div className={styles.infoBox}>
                      <div className={styles.infoIcon}>ℹ</div>
                      <div className={styles.infoContent}>
                        <strong>About this transfer</strong>
                        <p>
                          {mode === "domestic"
                            ? `FedWire transfers settle same-day for US institutions. Minimum $100, maximum $250,000 per transaction.`
                            : `International wires settle in the destination country's local rail (SEPA, NEFT, SPEI, etc.) via correspondent banking. Minimum $50, maximum $250,000 per transaction.`}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* ── Step 2 (international only): Country ──────────────── */}
                {mode === "international" && step === 2 && (
                  <>
                    <h2 className={styles.stepTitle}>Destination country</h2>

                    <div className={styles.formField}>
                      <label>Beneficiary country <span className={styles.required}>*</span></label>
                      <select
                        value={form.recipientCountry}
                        onChange={(e) => onCountryChange(e.target.value)}
                      >
                        <option value="">— select a country —</option>
                        {Object.entries(groupedCountries).map(([region, list]) => (
                          <optgroup key={region} label={region}>
                            {list.map((c) => (
                              <option key={c.iso2} value={c.iso2} disabled={!c.selectable}>
                                {c.name} ({c.currency})
                                {c.sanctions === "embargo" ? " — blocked" : ""}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    {selectedCountry && (
                      <>
                        <div className={styles.countryMetaCard}>
                          <div className={styles.countryMetaRow}>
                            <span className={styles.countryMetaLabel}>Clearing rail</span>
                            <span className={styles.countryMetaValue}>{selectedCountry.banking.primaryRail}</span>
                          </div>
                          <div className={styles.countryMetaRow}>
                            <span className={styles.countryMetaLabel}>Domestic system</span>
                            <span className={styles.countryMetaValue}>{selectedCountry.banking.domesticSystem}</span>
                          </div>
                          <div className={styles.countryMetaRow}>
                            <span className={styles.countryMetaLabel}>Local currency</span>
                            <span className={styles.countryMetaValue}>{selectedCountry.currency}</span>
                          </div>
                          <div className={styles.countryMetaRow}>
                            <span className={styles.countryMetaLabel}>Dialling code</span>
                            <span className={styles.countryMetaValue}>{selectedCountry.callingCode}</span>
                          </div>
                          {SANCTIONS_LABEL[selectedCountry.sanctions] && (
                            <div className={`${styles.countryMetaRow} ${styles.countrySanctions}`}>
                              <span className={styles.countryMetaLabel}>Compliance</span>
                              <span className={`${styles.statusPill} ${selectedCountry.sanctions === "embargo" ? styles.statusEmbargo : styles.statusWarn}`}>
                                {SANCTIONS_LABEL[selectedCountry.sanctions]}
                              </span>
                            </div>
                          )}
                        </div>

                        {selectedCountry.sanctions === "embargo" && (
                          <div className={styles.warningBox}>
                            <div className={styles.warningContent}>
                              <strong>Transfers to {selectedCountry.name} are prohibited</strong>
                              <p>This destination is under full sanctions. Please choose a different country.</p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {/* ── Beneficiary ──────────────────────────────────────── */}
                {((mode === "international" && step === 3) || (mode === "domestic" && step === 2)) && (
                  <>
                    <h2 className={styles.stepTitle}>Beneficiary</h2>

                    <div className={styles.formField + " " + styles.fullWidth}>
                      <label>Full legal name (as on account) <span className={styles.required}>*</span></label>
                      <input
                        value={form.recipientName}
                        onChange={(e) => update("recipientName", e.target.value)}
                        placeholder="e.g. John Robert Smith"
                        className={fieldErrors.recipientName ? styles.errorInput : ""}
                      />
                    </div>

                    <div className={styles.formField + " " + styles.fullWidth}>
                      <label>Address <span className={styles.required}>*</span></label>
                      <input
                        value={form.recipientAddress}
                        onChange={(e) => update("recipientAddress", e.target.value)}
                        placeholder="Street address"
                      />
                    </div>

                    <div className={styles.formGrid}>
                      <div className={styles.formField}>
                        <label>City</label>
                        <input value={form.recipientCity} onChange={(e) => update("recipientCity", e.target.value)} />
                      </div>
                      <div className={styles.formField}>
                        <label>Postal / ZIP code</label>
                        <input value={form.recipientPostalCode} onChange={(e) => update("recipientPostalCode", e.target.value)} />
                      </div>
                    </div>

                    <div className={styles.formGrid}>
                      <div className={styles.formField}>
                        <label>Phone {selectedCountry && `(${selectedCountry.callingCode})`}</label>
                        <input value={form.recipientPhone} onChange={(e) => update("recipientPhone", e.target.value)} />
                      </div>
                      <div className={styles.formField}>
                        <label>Email (optional)</label>
                        <input type="email" value={form.recipientEmail} onChange={(e) => update("recipientEmail", e.target.value)} />
                      </div>
                    </div>
                  </>
                )}

                {/* ── Bank details ────────────────────────────────────── */}
                {((mode === "international" && step === 4) || (mode === "domestic" && step === 3)) && (
                  <>
                    <h2 className={styles.stepTitle}>Beneficiary bank</h2>

                    <div className={styles.formField + " " + styles.fullWidth}>
                      <label>Bank name <span className={styles.required}>*</span></label>
                      <input value={form.bankName} onChange={(e) => update("bankName", e.target.value)} placeholder="e.g. HSBC UK" />
                    </div>

                    <div className={styles.formGrid}>
                      <div className={styles.formField}>
                        <label>Bank address {mode === "international" && <span className={styles.required}>*</span>}</label>
                        <input value={form.bankAddress} onChange={(e) => update("bankAddress", e.target.value)} />
                      </div>
                      <div className={styles.formField}>
                        <label>Bank city</label>
                        <input value={form.bankCity} onChange={(e) => update("bankCity", e.target.value)} />
                      </div>
                    </div>

                    {mode === "domestic" ? (
                      <div className={styles.formGrid}>
                        <div className={styles.formField}>
                          <label>ABA routing number (9 digits) <span className={styles.required}>*</span></label>
                          <input
                            value={form.routingNumberAba}
                            onChange={(e) => update("routingNumberAba", e.target.value.replace(/\D/g, "").slice(0, 9))}
                            placeholder="e.g. 021000021"
                            inputMode="numeric"
                            maxLength={9}
                            className={fieldErrors.recipientRoutingNumber ? styles.errorInput : ""}
                          />
                          {fieldErrors.recipientRoutingNumber && (
                            <div className={styles.errorMessage}>{fieldErrors.recipientRoutingNumber}</div>
                          )}
                        </div>
                        <div className={styles.formField}>
                          <label>Account number <span className={styles.required}>*</span></label>
                          <input value={form.accountNumber} onChange={(e) => update("accountNumber", e.target.value)} />
                        </div>
                      </div>
                    ) : (
                      selectedCountry && (
                        <div className={styles.railSection}>
                          <div className={styles.railHeader}>
                            <strong>{selectedCountry.banking.primaryRail}</strong> routing details required for {selectedCountry.name}
                          </div>
                          {selectedCountry.banking.fields.map((f) => (
                            <RailField
                              key={f.kind}
                              field={f}
                              value={(form as any)[mapKindToFormKey(f.kind)] || ""}
                              onChange={(val) => update(mapKindToFormKey(f.kind) as any, val as any)}
                              error={fieldErrors[mapKindToFormKey(f.kind)]}
                            />
                          ))}
                        </div>
                      )
                    )}

                    {mode === "international" && (
                      <details className={styles.advancedSection}>
                        <summary>Intermediary / correspondent bank (optional)</summary>
                        <div className={styles.formGrid}>
                          <div className={styles.formField}>
                            <label>Intermediary bank name</label>
                            <input value={form.intermediaryBank} onChange={(e) => update("intermediaryBank", e.target.value)} />
                          </div>
                          <div className={styles.formField}>
                            <label>Intermediary SWIFT/BIC</label>
                            <input
                              value={form.intermediarySwift}
                              onChange={(e) => update("intermediarySwift", e.target.value.toUpperCase())}
                              maxLength={11}
                            />
                          </div>
                        </div>
                      </details>
                    )}
                  </>
                )}

                {/* ── Purpose & Compliance ────────────────────────────── */}
                {((mode === "international" && step === 5) || (mode === "domestic" && step === 4)) && (
                  <>
                    <h2 className={styles.stepTitle}>Purpose &amp; compliance</h2>

                    <div className={styles.formField + " " + styles.fullWidth}>
                      <label>Purpose of transfer <span className={styles.required}>*</span></label>
                      <input
                        value={form.purpose}
                        onChange={(e) => update("purpose", e.target.value)}
                        placeholder="e.g. Payment for consulting services, family support, property purchase"
                        maxLength={300}
                      />
                      <div className={styles.charCount}>{form.purpose.length} / 300</div>
                    </div>

                    {mode === "international" && (
                      <div className={styles.formGrid}>
                        <div className={styles.formField}>
                          <label>Source of funds <span className={styles.required}>*</span></label>
                          <select value={form.sourceOfFunds} onChange={(e) => update("sourceOfFunds", e.target.value)}>
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
                        </div>
                        <div className={styles.formField}>
                          <label>Relationship to beneficiary <span className={styles.required}>*</span></label>
                          <select value={form.relationship} onChange={(e) => update("relationship", e.target.value)}>
                            <option value="">— select —</option>
                            <option>Self</option>
                            <option>Family</option>
                            <option>Friend</option>
                            <option>Employer / employee</option>
                            <option>Supplier / vendor</option>
                            <option>Customer</option>
                            <option>Other</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <div className={styles.formField + " " + styles.fullWidth}>
                      <label>Your reference (optional)</label>
                      <input value={form.reference} onChange={(e) => update("reference", e.target.value)} placeholder="Internal reference for your records" />
                    </div>

                    <div className={styles.feeEstimate}>
                      <h3>Fee summary</h3>
                      <div className={styles.feeRow}>
                        <span>Transfer amount</span>
                        <strong>{format(amountNumber)}</strong>
                      </div>
                      <div className={styles.feeRow}>
                        <span>Fee</span>
                        <strong>{format(fee)}</strong>
                      </div>
                      <div className={styles.feeRow + " " + styles.total}>
                        <span>Total to debit</span>
                        <strong>{format(total)}</strong>
                      </div>
                    </div>

                    <div className={styles.agreementBox}>
                      <input
                        type="checkbox"
                        id="compliance"
                        checked={form.complianceAccepted}
                        onChange={(e) => update("complianceAccepted", e.target.checked)}
                      />
                      <label htmlFor="compliance">
                        I confirm the information above is accurate and the funds are not derived from
                        illegal activity. I understand this transfer is subject to anti-money-laundering
                        review and may be delayed or blocked if it fails compliance checks.
                      </label>
                    </div>
                  </>
                )}

                {/* ── Action buttons ──────────────────────────────────── */}
                <div className={styles.formActions}>
                  {step > 1 ? (
                    <button className={styles.btnSecondary} onClick={() => setStep((s) => s - 1)} disabled={submitting}>
                      ← Back
                    </button>
                  ) : (
                    <span />
                  )}

                  {step < totalSteps ? (
                    <button
                      className={styles.btnPrimary}
                      onClick={() => canAdvance() && setStep((s) => s + 1)}
                      disabled={!canAdvance()}
                    >
                      Continue →
                    </button>
                  ) : (
                    <button
                      className={styles.btnPrimary}
                      onClick={submit}
                      disabled={!canAdvance() || submitting}
                    >
                      {submitting ? "Submitting…" : "Submit transfer"}
                    </button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        <Footer />
      </div>
    </div>
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
  const upper = ["iban", "swift_bic", "ifsc_in"].includes(field.kind);
  return (
    <div className={styles.formField + " " + styles.fullWidth}>
      <label>
        {field.label} {field.required && <span className={styles.required}>*</span>}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(upper ? e.target.value.toUpperCase() : e.target.value)}
        placeholder={field.placeholder}
        className={error ? styles.errorInput : ""}
      />
      {field.helpText && <div className={styles.helpText}>{field.helpText}</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
}

function mapKindToFormKey(kind: string): keyof FormState {
  switch (kind) {
    case "iban": return "iban";
    case "swift_bic": return "swiftBic";
    case "account_number": return "accountNumber";
    case "routing_number_aba": return "routingNumberAba";
    case "sort_code_uk": return "sortCodeUk";
    case "bsb_au": return "bsbAu";
    case "ifsc_in": return "ifscIn";
    case "clabe_mx": return "clabeMx";
    case "transit_ca": return "transitCa";
    case "bank_code_generic": return "bankCodeGeneric";
    case "branch_code_generic": return "branchCodeGeneric";
    case "tax_id": return "taxId";
    case "purpose_code": return "purposeCodeRbi";
    default: return "accountNumber";
  }
}

function newIdempotencyKey(): string {
  const buf = new Uint8Array(16);
  (typeof crypto !== "undefined" ? crypto : (globalThis as any).crypto).getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}
