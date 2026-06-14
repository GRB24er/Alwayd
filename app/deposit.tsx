import { ScrollView, Text, View, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState } from "react";

export default function DepositScreen() {
  const colors = useColors();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("checking");

  const accounts = [
    { id: "checking", name: "Premier Checking", number: "****4521", balance: 45892.67 },
    { id: "savings", name: "High-Yield Savings", number: "****7832", balance: 128450.33 },
  ];

  const quickAmounts = [1000, 5000, 10000, 25000, 50000, 100000];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(amount);

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2 flex-row items-center">
          <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, marginRight: 12 }]}>
            <IconSymbol name="chevron.right" size={22} color={colors.foreground} style={{ transform: [{ rotate: "180deg" }] }} />
          </Pressable>
          <View>
            <Text className="text-foreground text-2xl font-bold">Deposit</Text>
            <Text className="text-muted text-sm mt-0.5">Add funds to your account</Text>
          </View>
        </View>

        {/* Destination Account */}
        <View className="mx-5 mt-6">
          <Text className="text-foreground text-sm font-semibold mb-3">Deposit To</Text>
          {accounts.map((account) => (
            <Pressable
              key={account.id}
              onPress={() => setSelectedAccount(account.id)}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                  borderRadius: 14,
                  backgroundColor: selectedAccount === account.id ? "rgba(201, 169, 98, 0.08)" : colors.surface,
                  borderWidth: 1.5,
                  borderColor: selectedAccount === account.id ? "#C9A962" : colors.border,
                  marginBottom: 10,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(201, 169, 98, 0.1)", alignItems: "center", justifyContent: "center" }}>
                <IconSymbol name="building.columns.fill" size={18} color="#C9A962" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-foreground text-sm font-medium">{account.name}</Text>
                <Text className="text-muted text-xs mt-0.5">{account.number}</Text>
              </View>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 2,
                  borderColor: selectedAccount === account.id ? "#C9A962" : colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {selectedAccount === account.id && (
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#C9A962" }} />
                )}
              </View>
            </Pressable>
          ))}
        </View>

        {/* Amount Input */}
        <View className="mx-5 mt-6">
          <Text className="text-foreground text-sm font-semibold mb-3">Amount</Text>
          <View
            className="rounded-xl px-4 flex-row items-center"
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, height: 60 }}
          >
            <Text className="text-foreground text-2xl font-bold">$</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              style={{ flex: 1, marginLeft: 4, color: colors.foreground, fontSize: 28, fontWeight: "700" }}
            />
          </View>
        </View>

        {/* Quick Amounts */}
        <View className="mx-5 mt-4">
          <View className="flex-row flex-wrap gap-2">
            {quickAmounts.map((qa) => (
              <Pressable
                key={qa}
                onPress={() => setAmount(qa.toString())}
                style={({ pressed }) => [
                  {
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: amount === qa.toString() ? "rgba(201, 169, 98, 0.15)" : colors.surface,
                    borderWidth: 1,
                    borderColor: amount === qa.toString() ? "#C9A962" : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={{ color: amount === qa.toString() ? "#C9A962" : colors.foreground, fontSize: 13, fontWeight: "600" }}>
                  {formatCurrency(qa)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Deposit Methods */}
        <View className="mx-5 mt-6">
          <Text className="text-foreground text-sm font-semibold mb-3">Deposit Method</Text>
          <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            {[
              { title: "Bank Transfer (ACH)", subtitle: "1-3 business days", icon: "building.columns.fill" as const },
              { title: "Wire Transfer", subtitle: "Same day", icon: "paperplane.fill" as const },
              { title: "Mobile Check Deposit", subtitle: "1-2 business days", icon: "doc.text.fill" as const },
            ].map((method, idx) => (
              <Pressable
                key={idx}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    opacity: pressed ? 0.7 : 1,
                    borderBottomWidth: idx < 2 ? 0.5 : 0,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(201, 169, 98, 0.08)", alignItems: "center", justifyContent: "center" }}>
                  <IconSymbol name={method.icon} size={16} color="#C9A962" />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-foreground text-sm font-medium">{method.title}</Text>
                  <Text className="text-muted text-xs">{method.subtitle}</Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Submit */}
        <View className="mx-5 mt-6">
          <Pressable
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 16,
                borderRadius: 14,
                backgroundColor: amount ? "#C9A962" : "rgba(201, 169, 98, 0.3)",
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={{ color: "#001A3D", fontSize: 16, fontWeight: "700" }}>
              {amount ? `Deposit ${formatCurrency(Number(amount))}` : "Enter Amount"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
