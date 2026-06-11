import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, Animated, Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from "../../constants/theme";
import { initiateTransfer, fetchDashboard } from "../../api/client";
import { formatCurrency } from "../../utils/format";
import type { AccountType, Balances } from "../../types";

type TransferType = "internal" | "external" | "wire" | "international";
type Step = "details" | "amount" | "review" | "success";

const LABELS: Record<TransferType, string> = {
  internal: "Between Accounts",
  external: "External Transfer",
  wire: "Domestic Wire",
  international: "International Wire",
};

const COLORS: Record<TransferType, string> = {
  internal: Colors.info,
  external: Colors.gold,
  wire: Colors.warning,
  international: Colors.success,
};

const ICONS: Record<TransferType, keyof typeof Ionicons.glyphMap> = {
  internal: "swap-horizontal-outline",
  external: "business-outline",
  wire: "flash-outline",
  international: "globe-outline",
};

const ACCOUNT_OPTIONS: { value: AccountType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "checking", label: "Checking", icon: "wallet-outline" },
  { value: "savings", label: "Savings", icon: "shield-checkmark-outline" },
  { value: "investment", label: "Investment", icon: "trending-up-outline" },
];

export default function TransferFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const transferType: TransferType = route.params?.type || "internal";

  const [step, setStep] = useState<Step>("details");
  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState<Balances | null>(null);
  const [reference, setReference] = useState("");
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [fromAccount, setFromAccount] = useState<AccountType>("checking");
  const [toAccount, setToAccount] = useState<AccountType>("savings");
  const [recipientName, setRecipientName] = useState("");
  const [recipientAccount, setRecipientAccount] = useState("");
  const [recipientBank, setRecipientBank] = useState("");
  const [recipientRoutingNumber, setRecipientRoutingNumber] = useState("");
  const [swiftCode, setSwiftCode] = useState("");
  const [country, setCountry] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  React.useEffect(() => {
    fetchDashboard().then((d) => setBalances(d.balances)).catch(() => {});
  }, []);

  const animateTransition = useCallback((next: Step) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setStep(next);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }, [fadeAnim]);

  const canProceedDetails = (): boolean => {
    if (transferType === "internal") return fromAccount !== toAccount;
    if (!recipientName.trim() || !recipientAccount.trim()) return false;
    if (transferType === "external" || transferType === "wire") {
      return !!recipientRoutingNumber.trim() && !!recipientBank.trim();
    }
    if (transferType === "international") {
      return !!swiftCode.trim() && !!country.trim() && !!recipientBank.trim();
    }
    return true;
  };

  const canProceedAmount = (): boolean => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return false;
    if (balances) {
      const available = balances[fromAccount] || 0;
      if (num > available) return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        type: transferType,
        fromAccount,
        amount: parseFloat(amount),
        description: description.trim() || undefined,
      };
      if (transferType === "internal") {
        payload.toAccount = toAccount;
      } else {
        payload.recipientName = recipientName.trim();
        payload.recipientAccount = recipientAccount.trim();
        payload.recipientBank = recipientBank.trim();
        if (transferType === "external" || transferType === "wire") {
          payload.recipientRoutingNumber = recipientRoutingNumber.trim();
        }
        if (transferType === "international") {
          payload.swiftCode = swiftCode.trim();
          payload.country = country.trim();
        }
      }

      const result = await initiateTransfer(payload);
      setReference(result.reference || "");
      animateTransition("success");
    } catch (e: any) {
      Alert.alert("Transfer Failed", e?.message || "Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = step === "details" ? 0 : step === "amount" ? 1 : step === "review" ? 2 : 3;
  const accentColor = COLORS[transferType];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (step === "details" || step === "success") navigation.goBack();
            else if (step === "amount") animateTransition("details");
            else if (step === "review") animateTransition("amount");
          }}
          style={styles.backBtn}
        >
          <Ionicons
            name={step === "success" ? "close" : "chevron-back"}
            size={24}
            color={Colors.textPrimary}
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={[styles.headerIcon, { backgroundColor: `${accentColor}15` }]}>
            <Ionicons name={ICONS[transferType]} size={18} color={accentColor} />
          </View>
          <Text style={styles.headerTitle}>{LABELS[transferType]}</Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* Progress */}
      {step !== "success" && (
        <View style={styles.progressBar}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i <= stepIndex
                  ? { backgroundColor: accentColor }
                  : { backgroundColor: Colors.border },
              ]}
            />
          ))}
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Animated.View style={[{ flex: 1, opacity: fadeAnim }]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {step === "details" && renderDetails()}
            {step === "amount" && renderAmount()}
            {step === "review" && renderReview()}
            {step === "success" && renderSuccess()}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Footer button */}
      {step !== "success" && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={
              loading ||
              (step === "details" && !canProceedDetails()) ||
              (step === "amount" && !canProceedAmount())
            }
            onPress={() => {
              if (step === "details") animateTransition("amount");
              else if (step === "amount") animateTransition("review");
              else if (step === "review") handleSubmit();
            }}
          >
            <LinearGradient
              colors={
                (step === "details" && !canProceedDetails()) ||
                (step === "amount" && !canProceedAmount())
                  ? [Colors.textMuted, Colors.textMuted]
                  : [Colors.gold, Colors.goldDark]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              {loading ? (
                <ActivityIndicator color={Colors.navyDark} />
              ) : (
                <Text style={styles.ctaText}>
                  {step === "review" ? "Confirm Transfer" : "Continue"}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // ── Step renderers ──────────────────────────────────────

  function renderDetails() {
    return (
      <View>
        <Text style={styles.stepTitle}>Transfer Details</Text>
        <Text style={styles.stepSubtitle}>
          {transferType === "internal"
            ? "Move funds between your accounts"
            : "Enter the recipient's banking details"}
        </Text>

        {/* From account */}
        <Text style={styles.fieldLabel}>FROM ACCOUNT</Text>
        <View style={styles.accountPicker}>
          {ACCOUNT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.accountOption,
                fromAccount === opt.value && styles.accountOptionActive,
              ]}
              onPress={() => setFromAccount(opt.value)}
            >
              <Ionicons
                name={opt.icon}
                size={18}
                color={fromAccount === opt.value ? Colors.gold : Colors.textMuted}
              />
              <Text
                style={[
                  styles.accountOptionLabel,
                  fromAccount === opt.value && styles.accountOptionLabelActive,
                ]}
              >
                {opt.label}
              </Text>
              {balances && (
                <Text style={styles.accountOptionBal}>
                  {formatCurrency(balances[opt.value])}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {transferType === "internal" ? (
          <>
            <Text style={styles.fieldLabel}>TO ACCOUNT</Text>
            <View style={styles.accountPicker}>
              {ACCOUNT_OPTIONS.filter((o) => o.value !== fromAccount).map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.accountOption,
                    toAccount === opt.value && styles.accountOptionActive,
                  ]}
                  onPress={() => setToAccount(opt.value)}
                >
                  <Ionicons
                    name={opt.icon}
                    size={18}
                    color={toAccount === opt.value ? Colors.gold : Colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.accountOptionLabel,
                      toAccount === opt.value && styles.accountOptionLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            <FormField
              label="RECIPIENT NAME"
              placeholder="Full legal name"
              value={recipientName}
              onChangeText={setRecipientName}
              icon="person-outline"
            />
            <FormField
              label={transferType === "international" ? "ACCOUNT NUMBER / IBAN" : "ACCOUNT NUMBER"}
              placeholder={transferType === "international" ? "Enter IBAN or account number" : "Enter account number"}
              value={recipientAccount}
              onChangeText={setRecipientAccount}
              icon="document-text-outline"
              keyboardType="default"
            />
            <FormField
              label="BANK NAME"
              placeholder="Recipient's bank"
              value={recipientBank}
              onChangeText={setRecipientBank}
              icon="business-outline"
            />
            {(transferType === "external" || transferType === "wire") && (
              <FormField
                label="ROUTING NUMBER"
                placeholder="9-digit routing number"
                value={recipientRoutingNumber}
                onChangeText={setRecipientRoutingNumber}
                icon="keypad-outline"
                keyboardType="number-pad"
                maxLength={9}
              />
            )}
            {transferType === "international" && (
              <>
                <FormField
                  label="SWIFT / BIC CODE"
                  placeholder="8 or 11 character code"
                  value={swiftCode}
                  onChangeText={setSwiftCode}
                  icon="code-outline"
                  autoCapitalize="characters"
                  maxLength={11}
                />
                <FormField
                  label="COUNTRY"
                  placeholder="Recipient's country"
                  value={country}
                  onChangeText={setCountry}
                  icon="flag-outline"
                />
              </>
            )}
          </>
        )}
      </View>
    );
  }

  function renderAmount() {
    const parsedAmount = parseFloat(amount) || 0;
    const available = balances ? balances[fromAccount] : 0;

    return (
      <View style={styles.amountContainer}>
        <Text style={styles.stepTitle}>Enter Amount</Text>
        <Text style={styles.stepSubtitle}>
          Available: {formatCurrency(available)}
        </Text>

        <View style={styles.amountInputWrap}>
          <Text style={styles.currencySign}>$</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9.]/g, "");
              const parts = cleaned.split(".");
              if (parts.length > 2) return;
              if (parts[1] && parts[1].length > 2) return;
              setAmount(cleaned);
            }}
            placeholder="0.00"
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>

        {parsedAmount > available && available > 0 && (
          <View style={styles.amountError}>
            <Ionicons name="alert-circle" size={14} color={Colors.error} />
            <Text style={styles.amountErrorText}>Insufficient funds</Text>
          </View>
        )}

        <FormField
          label="MEMO (OPTIONAL)"
          placeholder="Add a note"
          value={description}
          onChangeText={setDescription}
          icon="chatbubble-outline"
        />
      </View>
    );
  }

  function renderReview() {
    const parsedAmount = parseFloat(amount) || 0;
    const rows: { label: string; value: string }[] = [
      { label: "Type", value: LABELS[transferType] },
      { label: "From", value: fromAccount.charAt(0).toUpperCase() + fromAccount.slice(1) },
    ];
    if (transferType === "internal") {
      rows.push({ label: "To", value: toAccount.charAt(0).toUpperCase() + toAccount.slice(1) });
    } else {
      rows.push({ label: "Recipient", value: recipientName });
      rows.push({ label: "Account", value: recipientAccount });
      rows.push({ label: "Bank", value: recipientBank });
      if (recipientRoutingNumber) rows.push({ label: "Routing", value: recipientRoutingNumber });
      if (swiftCode) rows.push({ label: "SWIFT/BIC", value: swiftCode });
      if (country) rows.push({ label: "Country", value: country });
    }
    if (description.trim()) rows.push({ label: "Memo", value: description });

    return (
      <View>
        <Text style={styles.stepTitle}>Review Transfer</Text>
        <Text style={styles.stepSubtitle}>Please verify all details before confirming</Text>

        <View style={styles.reviewAmountCard}>
          <Text style={styles.reviewAmountLabel}>Amount</Text>
          <Text style={styles.reviewAmount}>{formatCurrency(parsedAmount)}</Text>
        </View>

        <View style={styles.reviewCard}>
          {rows.map((row, i) => (
            <React.Fragment key={row.label}>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{row.label}</Text>
                <Text style={styles.reviewValue}>{row.value}</Text>
              </View>
              {i < rows.length - 1 && <View style={styles.reviewDivider} />}
            </React.Fragment>
          ))}
        </View>

        <View style={styles.disclaimer}>
          <Ionicons name="shield-checkmark" size={14} color={Colors.success} />
          <Text style={styles.disclaimerText}>
            This transfer is protected by 256-bit encryption and will be processed securely.
          </Text>
        </View>
      </View>
    );
  }

  function renderSuccess() {
    return (
      <View style={styles.successContainer}>
        <View style={[styles.successIcon, { backgroundColor: `${accentColor}15` }]}>
          <Ionicons name="checkmark-circle" size={64} color={accentColor} />
        </View>
        <Text style={styles.successTitle}>Transfer Initiated</Text>
        <Text style={styles.successSubtitle}>
          Your transfer is being processed and awaiting approval.
        </Text>

        {reference ? (
          <View style={styles.referenceCard}>
            <Text style={styles.referenceLabel}>Reference Number</Text>
            <Text style={styles.referenceValue}>{reference}</Text>
          </View>
        ) : null}

        <View style={styles.successDetails}>
          <View style={styles.successRow}>
            <Text style={styles.successDetailLabel}>Amount</Text>
            <Text style={styles.successDetailValue}>{formatCurrency(parseFloat(amount))}</Text>
          </View>
          <View style={styles.successDivider} />
          <View style={styles.successRow}>
            <Text style={styles.successDetailLabel}>Status</Text>
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>Pending</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.doneBtn}
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <LinearGradient
            colors={[Colors.gold, Colors.goldDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>Done</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }
}

// ── Reusable form field ───────────────────────────────────

function FormField({
  label, placeholder, value, onChangeText, icon, keyboardType, autoCapitalize, maxLength,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  icon: keyof typeof Ionicons.glyphMap;
  keyboardType?: TextInput["props"]["keyboardType"];
  autoCapitalize?: TextInput["props"]["autoCapitalize"];
  maxLength?: number;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldWrap}>
        <Ionicons name={icon} size={18} color={Colors.textMuted} style={styles.fieldIcon} />
        <TextInput
          style={styles.fieldInput}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
        />
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: BorderRadius.md,
    backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.border,
  },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  headerIcon: {
    width: 32, height: 32, borderRadius: BorderRadius.sm,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    fontSize: FontSize.subtitle, color: Colors.textPrimary, fontWeight: FontWeight.semibold,
  },
  progressBar: {
    flexDirection: "row", justifyContent: "center", gap: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  progressDot: { width: 28, height: 3, borderRadius: 2 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.section },
  footer: {
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.bg,
  },
  ctaGradient: {
    height: 52, borderRadius: BorderRadius.md,
    alignItems: "center", justifyContent: "center",
    ...Shadow.gold,
  },
  ctaText: {
    fontSize: FontSize.subtitle, fontWeight: FontWeight.bold,
    color: Colors.navyDark, letterSpacing: 0.5,
  },

  stepTitle: {
    fontSize: FontSize.heading, color: Colors.textPrimary,
    fontWeight: FontWeight.bold, marginBottom: Spacing.xs,
  },
  stepSubtitle: {
    fontSize: FontSize.body, color: Colors.textMuted, marginBottom: Spacing.xxl,
  },

  fieldGroup: { marginBottom: Spacing.lg },
  fieldLabel: {
    fontSize: FontSize.label, color: Colors.textSecondary,
    fontWeight: FontWeight.semibold, letterSpacing: 0.5, marginBottom: Spacing.sm,
    textTransform: "uppercase",
  },
  fieldWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.bgInput, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  fieldIcon: { paddingLeft: Spacing.md },
  fieldInput: {
    flex: 1, height: 50, paddingHorizontal: Spacing.md,
    fontSize: FontSize.body, color: Colors.textPrimary,
  },

  accountPicker: { marginBottom: Spacing.xl, gap: Spacing.sm },
  accountOption: {
    flexDirection: "row", alignItems: "center", gap: Spacing.md,
    backgroundColor: Colors.bgCard, borderRadius: BorderRadius.md,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
  },
  accountOptionActive: {
    borderColor: Colors.gold, backgroundColor: Colors.goldMuted,
  },
  accountOptionLabel: {
    flex: 1, fontSize: FontSize.body, color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  accountOptionLabelActive: { color: Colors.textPrimary, fontWeight: FontWeight.semibold },
  accountOptionBal: {
    fontSize: FontSize.body, color: Colors.textMuted, fontWeight: FontWeight.semibold,
  },

  amountContainer: { alignItems: "center" },
  amountInputWrap: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    marginVertical: Spacing.xxxl,
  },
  currencySign: {
    fontSize: FontSize.hero, color: Colors.textMuted, fontWeight: FontWeight.bold,
    marginRight: Spacing.xs,
  },
  amountInput: {
    fontSize: 48, color: Colors.textPrimary, fontWeight: FontWeight.heavy,
    minWidth: 120, textAlign: "center",
  },
  amountError: {
    flexDirection: "row", alignItems: "center", gap: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  amountErrorText: { fontSize: FontSize.body, color: Colors.error },

  reviewAmountCard: {
    backgroundColor: Colors.bgCardElevated, borderRadius: BorderRadius.xl,
    padding: Spacing.xxl, alignItems: "center",
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg,
  },
  reviewAmountLabel: {
    fontSize: FontSize.label, color: Colors.textMuted,
    textTransform: "uppercase", letterSpacing: 1, marginBottom: Spacing.xs,
  },
  reviewAmount: {
    fontSize: FontSize.hero, color: Colors.textPrimary, fontWeight: FontWeight.heavy,
  },
  reviewCard: {
    backgroundColor: Colors.bgCard, borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: Colors.border, overflow: "hidden",
  },
  reviewRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  reviewLabel: { fontSize: FontSize.body, color: Colors.textMuted },
  reviewValue: {
    fontSize: FontSize.body, color: Colors.textPrimary, fontWeight: FontWeight.semibold,
    maxWidth: "60%", textAlign: "right",
  },
  reviewDivider: { height: 1, backgroundColor: Colors.divider, marginLeft: Spacing.lg },
  disclaimer: {
    flexDirection: "row", alignItems: "center", gap: Spacing.sm,
    marginTop: Spacing.xl, paddingHorizontal: Spacing.xs,
  },
  disclaimerText: { flex: 1, fontSize: FontSize.label, color: Colors.textMuted },

  successContainer: { alignItems: "center", paddingTop: Spacing.xxxxl },
  successIcon: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: "center", justifyContent: "center", marginBottom: Spacing.xxl,
  },
  successTitle: {
    fontSize: FontSize.heading, color: Colors.textPrimary,
    fontWeight: FontWeight.bold, marginBottom: Spacing.sm,
  },
  successSubtitle: {
    fontSize: FontSize.body, color: Colors.textMuted,
    textAlign: "center", marginBottom: Spacing.xxxl,
    paddingHorizontal: Spacing.xxl,
  },
  referenceCard: {
    backgroundColor: Colors.bgCard, borderRadius: BorderRadius.lg,
    padding: Spacing.xl, alignItems: "center", width: "100%",
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg,
  },
  referenceLabel: {
    fontSize: FontSize.label, color: Colors.textMuted,
    textTransform: "uppercase", letterSpacing: 1, marginBottom: Spacing.xs,
  },
  referenceValue: {
    fontSize: FontSize.title, color: Colors.gold,
    fontWeight: FontWeight.bold, letterSpacing: 1,
  },
  successDetails: {
    backgroundColor: Colors.bgCard, borderRadius: BorderRadius.lg,
    width: "100%", borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.xxxl, overflow: "hidden",
  },
  successRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: Spacing.lg,
  },
  successDetailLabel: { fontSize: FontSize.body, color: Colors.textMuted },
  successDetailValue: {
    fontSize: FontSize.body, color: Colors.textPrimary, fontWeight: FontWeight.bold,
  },
  successDivider: { height: 1, backgroundColor: Colors.divider },
  pendingBadge: {
    backgroundColor: Colors.warningBg, borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xxs,
  },
  pendingText: {
    fontSize: FontSize.label, color: Colors.warning, fontWeight: FontWeight.semibold,
  },
  doneBtn: { width: "100%", ...Shadow.gold },
});
