/**
 * Transfers Screen — Send money with biometric confirmation
 * 
 * Connects to the Alwayd web app's /api/mobile/transfers endpoint.
 * Requires biometric authentication for transfer confirmation when enabled.
 */

import { ScrollView, Text, View, Pressable, TextInput, Alert, Platform, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState } from "react";
import * as BankingAPI from "@/lib/banking-api";
import * as BiometricAuth from "@/lib/biometric-auth";
import * as NotificationService from "@/lib/notifications";
import * as Haptics from "expo-haptics";

const TRANSFER_TYPES = [
  { id: "internal", title: "Internal", subtitle: "Between your accounts", icon: "arrow.left.arrow.right" as const },
  { id: "wire", title: "Wire Transfer", subtitle: "Domestic wire", icon: "paperplane.fill" as const },
  { id: "international", title: "International", subtitle: "Cross-border transfer", icon: "building.columns.fill" as const },
  { id: "scheduled", title: "Scheduled", subtitle: "Recurring transfers", icon: "doc.text.fill" as const },
];

const RECENT_RECIPIENTS = [
  { id: "1", name: "John D.", initials: "JD", lastTransfer: "$5,000" },
  { id: "2", name: "Sarah M.", initials: "SM", lastTransfer: "$2,500" },
  { id: "3", name: "Corp LLC", initials: "CL", lastTransfer: "$15,000" },
  { id: "4", name: "Alex W.", initials: "AW", lastTransfer: "$1,200" },
];

const RECENT_TRANSFERS = [
  { id: "1", recipient: "John Davidson", amount: -5000, date: "Jun 12", status: "Completed", type: "Internal" },
  { id: "2", recipient: "Corp LLC", amount: -15000, date: "Jun 10", status: "Completed", type: "Wire" },
  { id: "3", recipient: "EUR Account", amount: -8750, date: "Jun 8", status: "Processing", type: "International" },
];

export default function TransfersScreen() {
  const colors = useColors();
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Transfer form state
  const [amount, setAmount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientAccount, setRecipientAccount] = useState("");
  const [description, setDescription] = useState("");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  function handleTypeSelect(typeId: string) {
    setSelectedType(typeId);
    setShowForm(true);
  }

  async function handleSubmitTransfer() {
    const transferAmount = parseFloat(amount);
    if (!transferAmount || transferAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid transfer amount.");
      return;
    }

    // Biometric confirmation
    const authenticated = await BiometricAuth.authenticateForTransaction(transferAmount);
    if (!authenticated) {
      return; // User cancelled or failed biometric
    }

    setIsSubmitting(true);

    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const result = await BankingAPI.initiateTransfer({
        type: (selectedType as any) || "internal",
        fromAccount: "checking",
        recipientName: recipientName || undefined,
        recipientAccount: recipientAccount || undefined,
        amount: transferAmount,
        description: description || `${selectedType} transfer`,
      });

      if (result.success) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        // Send notification
        await NotificationService.notifyTransfer({
          title: "Transfer Sent",
          body: `$${transferAmount.toFixed(2)} sent to ${recipientName || "your account"}`,
          reference: result.reference,
          status: "pending",
        });

        Alert.alert(
          "Transfer Initiated",
          `$${transferAmount.toFixed(2)} transfer has been submitted.\nReference: ${result.reference || "Processing"}`,
          [
            {
              text: "View Receipt",
              onPress: () => router.push({
                pathname: "/receipt",
                params: {
                  reference: result.reference || "PENDING",
                  type: selectedType || "transfer",
                  amount: String(-transferAmount),
                  currency: "USD",
                  date: new Date().toISOString(),
                  status: "pending",
                  description: description || `${selectedType} transfer`,
                  accountType: "checking",
                  recipientName: recipientName,
                },
              } as any),
            },
            { text: "Done", style: "cancel" },
          ]
        );

        // Reset form
        setAmount("");
        setRecipientName("");
        setRecipientAccount("");
        setDescription("");
        setShowForm(false);
      } else {
        Alert.alert("Transfer Failed", result.error || "Please try again later.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transfer failed";
      Alert.alert("Error", message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-foreground text-2xl font-bold">Transfers</Text>
          <Text className="text-muted text-sm mt-1">Send money securely</Text>
        </View>

        {/* Transfer Types */}
        <View className="mx-5 mt-4">
          <Text className="text-foreground text-sm font-semibold mb-3">Transfer Type</Text>
          <View className="flex-row flex-wrap gap-3">
            {TRANSFER_TYPES.map((type) => (
              <Pressable
                key={type.id}
                onPress={() => handleTypeSelect(type.id)}
                style={({ pressed }) => [
                  {
                    width: "47.5%",
                    padding: 16,
                    borderRadius: 16,
                    backgroundColor: selectedType === type.id ? "rgba(201, 169, 98, 0.1)" : colors.surface,
                    borderWidth: 1.5,
                    borderColor: selectedType === type.id ? "#C9A962" : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: selectedType === type.id ? "rgba(201, 169, 98, 0.15)" : "rgba(201, 169, 98, 0.08)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 10,
                  }}
                >
                  <IconSymbol name={type.icon} size={20} color="#C9A962" />
                </View>
                <Text className="text-foreground text-sm font-semibold">{type.title}</Text>
                <Text className="text-muted text-xs mt-0.5">{type.subtitle}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Transfer Form */}
        {showForm && (
          <View className="mx-5 mt-6">
            <Text className="text-foreground text-sm font-semibold mb-3">Transfer Details</Text>
            <View className="rounded-2xl p-4" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              {/* Amount */}
              <View className="mb-4">
                <Text className="text-muted text-xs font-medium mb-2 uppercase tracking-wider">Amount</Text>
                <View className="flex-row items-center" style={{ backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 }}>
                  <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "700" }}>$</Text>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor={colors.muted}
                    keyboardType="decimal-pad"
                    style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 8, fontSize: 18, fontWeight: "700", color: colors.foreground }}
                  />
                </View>
              </View>

              {/* Recipient Name */}
              {selectedType !== "internal" && (
                <View className="mb-4">
                  <Text className="text-muted text-xs font-medium mb-2 uppercase tracking-wider">Recipient Name</Text>
                  <TextInput
                    value={recipientName}
                    onChangeText={setRecipientName}
                    placeholder="Enter recipient name"
                    placeholderTextColor={colors.muted}
                    style={{ backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.foreground }}
                  />
                </View>
              )}

              {/* Recipient Account */}
              {selectedType !== "internal" && (
                <View className="mb-4">
                  <Text className="text-muted text-xs font-medium mb-2 uppercase tracking-wider">Account Number</Text>
                  <TextInput
                    value={recipientAccount}
                    onChangeText={setRecipientAccount}
                    placeholder="Enter account number"
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                    style={{ backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.foreground }}
                  />
                </View>
              )}

              {/* Description */}
              <View className="mb-4">
                <Text className="text-muted text-xs font-medium mb-2 uppercase tracking-wider">Description (Optional)</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Add a note"
                  placeholderTextColor={colors.muted}
                  style={{ backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.foreground }}
                />
              </View>

              {/* Submit */}
              <Pressable
                onPress={handleSubmitTransfer}
                disabled={isSubmitting || !amount}
                style={({ pressed }) => [{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: amount ? "#C9A962" : "rgba(201, 169, 98, 0.3)",
                  opacity: isSubmitting ? 0.7 : pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                }]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#001A3D" />
                ) : (
                  <>
                    <IconSymbol name="faceid" size={18} color="#001A3D" />
                    <Text style={{ color: "#001A3D", fontSize: 15, fontWeight: "700" }}>Confirm & Send</Text>
                  </>
                )}
              </Pressable>

              <Text style={{ fontSize: 10, color: colors.muted, textAlign: "center", marginTop: 8 }}>
                Biometric authentication required for transfers
              </Text>
            </View>
          </View>
        )}

        {/* Recent Recipients */}
        <View className="mt-6">
          <View className="px-5 flex-row items-center justify-between mb-3">
            <Text className="text-foreground text-sm font-semibold">Recent Recipients</Text>
            <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
              <Text style={{ color: "#C9A962", fontSize: 13, fontWeight: "600" }}>Manage</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}>
            {/* Add New */}
            <Pressable
              style={({ pressed }) => [
                {
                  alignItems: "center",
                  width: 64,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: "rgba(201, 169, 98, 0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1.5,
                  borderColor: "#C9A962",
                  borderStyle: "dashed",
                }}
              >
                <IconSymbol name="plus" size={22} color="#C9A962" />
              </View>
              <Text className="text-muted text-xs mt-2 text-center">Add New</Text>
            </Pressable>
            {RECENT_RECIPIENTS.map((recipient) => (
              <Pressable
                key={recipient.id}
                onPress={() => {
                  setRecipientName(recipient.name);
                  setSelectedType("wire");
                  setShowForm(true);
                }}
                style={({ pressed }) => [
                  {
                    alignItems: "center",
                    width: 64,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: "#001A3D",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#C9A962", fontSize: 16, fontWeight: "700" }}>{recipient.initials}</Text>
                </View>
                <Text className="text-foreground text-xs mt-2 text-center" numberOfLines={1}>{recipient.name}</Text>
                <Text className="text-muted text-xs">{recipient.lastTransfer}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Recent Transfers */}
        <View className="mx-5 mt-6">
          <Text className="text-foreground text-sm font-semibold mb-3">Recent Transfers</Text>
          <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            {RECENT_TRANSFERS.map((transfer, idx) => (
              <Pressable
                key={transfer.id}
                onPress={() => router.push({
                  pathname: "/receipt",
                  params: {
                    reference: `TRF-${transfer.id}`,
                    type: "transfer-out",
                    amount: String(transfer.amount),
                    currency: "USD",
                    date: "2026-06-" + transfer.date.split(" ")[1],
                    status: transfer.status.toLowerCase(),
                    description: `${transfer.type} transfer to ${transfer.recipient}`,
                    accountType: "checking",
                    recipientName: transfer.recipient,
                  },
                } as any)}
                style={({ pressed }) => [{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: idx < RECENT_TRANSFERS.length - 1 ? 0.5 : 0,
                  borderBottomColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                }]}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: "rgba(239, 68, 68, 0.08)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconSymbol name="paperplane.fill" size={18} color={colors.error} />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-foreground text-sm font-medium">{transfer.recipient}</Text>
                  <View className="flex-row items-center gap-2 mt-0.5">
                    <Text className="text-muted text-xs">{transfer.date}</Text>
                    <Text className="text-muted text-xs">·</Text>
                    <Text className="text-muted text-xs">{transfer.type}</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-foreground text-sm font-semibold">
                    -{formatCurrency(transfer.amount)}
                  </Text>
                  <View
                    className="mt-0.5 px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: transfer.status === "Completed" ? "rgba(34, 197, 94, 0.1)" : "rgba(245, 158, 11, 0.1)",
                    }}
                  >
                    <Text
                      style={{
                        color: transfer.status === "Completed" ? colors.success : colors.warning,
                        fontSize: 9,
                        fontWeight: "600",
                      }}
                    >
                      {transfer.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
