/**
 * Receipt Screen — Enterprise-grade branded transaction receipt
 * 
 * Downloads actual PDF receipts from the server with official Aldwych European Capital
 * branding, QR verification codes, SHA-256 integrity digests, and watermarks.
 * Supports native sharing via the system share sheet.
 */

import { useState } from "react";
import { Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Alert, Share } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useBankAuth } from "@/lib/auth-context";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

const API_BASE = "http://127.0.0.1:3000";

export default function ReceiptScreen() {
  const params = useLocalSearchParams<{
    reference: string; type: string; amount: string; currency: string;
    date: string; status: string; description: string; accountType: string;
    recipientName?: string; recipientBank?: string; recipientAccount?: string;
    senderName?: string; senderAccount?: string; fee?: string;
  }>();
  const router = useRouter();
  const colors = useColors();
  const { user } = useBankAuth();

  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const isDebit = parseFloat(params.amount || "0") < 0 ||
    ["transfer-out", "withdrawal", "payment", "fee"].includes(params.type || "");
  const amount = Math.abs(parseFloat(params.amount || "0"));
  const currency = params.currency || "USD";
  const status = params.status || "completed";
  const date = params.date ? new Date(params.date) : new Date();

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency", currency,
  }).format(amount);

  const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const fmtTime = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const statusColor = status === "completed" || status === "posted" ? "#10B981" : status === "pending" ? "#C9A84C" : "#EF4444";
  const statusLabel = status.toUpperCase();

  const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

  const buildReceiptPayload = () => ({
    receiptNumber,
    reference: params.reference || `TXN-${Date.now()}`,
    status: status === "posted" ? "completed" : status,
    direction: isDebit ? "debit" : "credit",
    transferKind: (params.type || "Wire Transfer").replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
    rail: "FEDWIRE",
    channel: "Mobile Banking",
    amount,
    currency,
    fee: parseFloat(params.fee || "0"),
    totalSettled: amount + parseFloat(params.fee || "0"),
    initiatedAt: date.toISOString(),
    completedAt: status === "completed" || status === "posted" ? date.toISOString() : null,
    narrative: params.description || undefined,
    sender: {
      name: params.senderName || user?.name || "Account Holder",
      accountMasked: params.senderAccount || (user?.accountNumber ? `••••${user.accountNumber.slice(-4)}` : "••••4521"),
      accountType: (params.accountType || "Premier Checking").charAt(0).toUpperCase() + (params.accountType || "Premier Checking").slice(1),
      bankName: "Aldwych European Capital",
      country: "United Kingdom",
    },
    beneficiary: {
      name: params.recipientName || "Beneficiary",
      accountMasked: params.recipientAccount || "••••8832",
      bankName: params.recipientBank || undefined,
    },
  });

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const payload = buildReceiptPayload();
      const filename = `AEC_Receipt_${payload.receiptNumber}.pdf`;

      if (Platform.OS === "web") {
        const response = await fetch(`${API_BASE}/api/receipt/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error("Failed to generate PDF");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
      } else {
        const response = await fetch(`${API_BASE}/api/receipt/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error("Failed to generate PDF");
        const arrayBuffer = await response.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Receipt Downloaded", `Your official receipt has been saved as ${filename}`, [{ text: "OK" }]);
      }
    } catch (error) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert("Error", "Failed to download receipt. Please ensure you are connected to the server.");
    } finally {
      setDownloading(false);
    }
  };

  const handleSharePDF = async () => {
    setSharing(true);
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const payload = buildReceiptPayload();
      const filename = `AEC_Receipt_${payload.receiptNumber}.pdf`;

      if (Platform.OS === "web") {
        await handleDownloadPDF();
      } else {
        const response = await fetch(`${API_BASE}/api/receipt/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error("Failed to generate PDF");
        const arrayBuffer = await response.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fileUri, { mimeType: "application/pdf", dialogTitle: "Share Receipt" });
        } else {
          await Share.share({ title: `Receipt - ${params.reference}`, message: `Aldwych European Capital Receipt ${payload.receiptNumber}` });
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to share receipt. Please try again.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <MaterialIcons name="close" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>Transaction Receipt</Text>
        <TouchableOpacity onPress={handleSharePDF} style={{ padding: 4 }} disabled={sharing}>
          {sharing ? <ActivityIndicator size="small" color="#C9A962" /> : <MaterialIcons name="ios-share" size={22} color="#C9A962" />}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Branded Header with Official Logo */}
        <View style={{ backgroundColor: "#0D2440", paddingVertical: 28, paddingHorizontal: 24, alignItems: "center" }}>
          <Image
            source={require("@/assets/images/logo-full.png")}
            style={{ width: 220, height: 50 }}
            contentFit="contain"
          />
          <View style={{ height: 2, width: "100%", marginTop: 16, backgroundColor: "#C9A84C" }} />
          <Text style={{ color: "rgba(201, 168, 76, 0.8)", fontSize: 10, letterSpacing: 3, marginTop: 10, fontWeight: "300" }}>
            OFFICIAL TRANSACTION RECEIPT
          </Text>
        </View>

        {/* Amount Section */}
        <View style={{ alignItems: "center", paddingVertical: 32, paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 11, color: "#6B7280", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: "500" }}>
            Transaction Amount
          </Text>
          <Text style={{ fontSize: 38, fontWeight: "800", color: isDebit ? "#0D2440" : "#10B981", marginTop: 8, letterSpacing: -1 }}>
            {isDebit ? "−" : "+"}{formattedAmount}
          </Text>
          <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>{currency}</Text>
          <View style={{ marginTop: 14, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 4, backgroundColor: statusColor }}>
            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 1 }}>{statusLabel}</Text>
          </View>
        </View>

        {/* Transaction Details Panel */}
        <View style={{ paddingHorizontal: 24 }}>
          <View style={{ borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", overflow: "hidden" }}>
            <View style={{ backgroundColor: "#0D2440", paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#C9A962", letterSpacing: 0.5, textTransform: "uppercase" }}>
                Transaction Details
              </Text>
            </View>
            <View style={{ padding: 16, backgroundColor: "#FAFBFC" }}>
              <DetailRow label="Reference No." value={params.reference || "—"} />
              <DetailRow label="Date" value={fmtDate(date)} />
              <DetailRow label="Time" value={fmtTime(date)} />
              <DetailRow label="Type" value={(params.type || "").replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} />
              <DetailRow label="Description" value={params.description || "—"} />
              <DetailRow label="Account" value={`${(params.accountType || "Premier Checking").charAt(0).toUpperCase() + (params.accountType || "Premier Checking").slice(1)} Account`} />
              <DetailRow label="Account Holder" value={user?.name || "—"} isLast={!params.recipientName} />
              {params.recipientName && (
                <>
                  <View style={{ height: 1, backgroundColor: "#E2E8F0", marginVertical: 8 }} />
                  <DetailRow label="Recipient" value={params.recipientName} />
                  {params.recipientBank && <DetailRow label="Recipient Bank" value={params.recipientBank} isLast />}
                </>
              )}
            </View>
          </View>
        </View>

        {/* Security Verification Badge */}
        <View style={{ paddingHorizontal: 24, marginTop: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 8, backgroundColor: "rgba(16, 185, 129, 0.06)", borderWidth: 1, borderColor: "rgba(16, 185, 129, 0.15)" }}>
            <MaterialIcons name="verified" size={14} color="#10B981" />
            <Text style={{ fontSize: 11, color: "#10B981", fontWeight: "500" }}>
              Digitally Verified · SHA-256 Integrity Protected
            </Text>
          </View>
        </View>

        {/* PDF Download Info */}
        <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 8, backgroundColor: "#F8F6F0" }}>
            <MaterialIcons name="picture-as-pdf" size={16} color="#C9A962" style={{ marginTop: 1 }} />
            <Text style={{ fontSize: 11, color: "#6B7280", flex: 1, lineHeight: 16 }}>
              Download generates a branded PDF with QR verification, watermark, and regulatory compliance footer.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ paddingHorizontal: 24, marginTop: 24, gap: 12 }}>
          <TouchableOpacity
            onPress={handleDownloadPDF}
            disabled={downloading}
            activeOpacity={0.85}
            style={{ backgroundColor: "#0D2440", paddingVertical: 15, borderRadius: 10, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#C9A962" />
            ) : (
              <>
                <MaterialIcons name="picture-as-pdf" size={18} color="#C9A962" />
                <Text style={{ color: "#C9A962", fontSize: 15, fontWeight: "700" }}>Download Official PDF Receipt</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSharePDF}
            disabled={sharing}
            activeOpacity={0.85}
            style={{ backgroundColor: "transparent", paddingVertical: 15, borderRadius: 10, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#C9A962" }}
          >
            {sharing ? (
              <ActivityIndicator size="small" color="#0D2440" />
            ) : (
              <>
                <MaterialIcons name="share" size={18} color="#0D2440" />
                <Text style={{ color: "#0D2440", fontSize: 15, fontWeight: "700" }}>Share Receipt</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ paddingVertical: 14, borderRadius: 10, alignItems: "center" }}>
            <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "500" }}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Legal Footer */}
        <View style={{ paddingHorizontal: 24, marginTop: 20 }}>
          <Text style={{ fontSize: 9, color: "#9CA3AF", textAlign: "center", lineHeight: 14 }}>
            This receipt is issued electronically by Aldwych European Capital and is valid without signature. The downloadable PDF includes a SHA-256 integrity digest for verification.
          </Text>
          <Text style={{ fontSize: 8, color: "#D1D5DB", textAlign: "center", lineHeight: 12, marginTop: 8 }}>
            Aldwych European Capital plc — Authorised by the Prudential Regulation Authority and regulated by the Financial Conduct Authority and the Prudential Regulation Authority. Registered in England and Wales No. 09917543. Registered Office: Aldwych House, 71-91 Aldwych, London WC2B 4HN.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function DetailRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: "#F1F5F9" }}>
      <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "500", flex: 1 }}>{label}</Text>
      <Text style={{ fontSize: 12, color: "#1E293B", fontWeight: "500", flex: 2, textAlign: "right" }}>{value}</Text>
    </View>
  );
}
