import { ScrollView, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

const UPCOMING_BILLS = [
  { id: "1", payee: "Hydro One", amount: 245.50, dueDate: "Jun 18", category: "Utilities", autopay: true },
  { id: "2", payee: "Bell Canada", amount: 89.99, dueDate: "Jun 20", category: "Telecom", autopay: true },
  { id: "3", payee: "TD Insurance", amount: 312.00, dueDate: "Jun 25", category: "Insurance", autopay: false },
  { id: "4", payee: "City of Toronto", amount: 1850.00, dueDate: "Jul 1", category: "Property Tax", autopay: false },
];

const PAID_BILLS = [
  { id: "5", payee: "Netflix", amount: 22.99, paidDate: "Jun 10", category: "Entertainment" },
  { id: "6", payee: "Rogers", amount: 145.00, paidDate: "Jun 8", category: "Telecom" },
  { id: "7", payee: "Enbridge Gas", amount: 67.45, paidDate: "Jun 5", category: "Utilities" },
];

export default function BillsScreen() {
  const colors = useColors();
  const router = useRouter();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(amount);

  const totalUpcoming = UPCOMING_BILLS.reduce((sum, b) => sum + b.amount, 0);

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2 flex-row items-center">
          <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, marginRight: 12 }]}>
            <IconSymbol name="chevron.right" size={22} color={colors.foreground} style={{ transform: [{ rotate: "180deg" }] }} />
          </Pressable>
          <View>
            <Text className="text-foreground text-2xl font-bold">Bills & Payments</Text>
            <Text className="text-muted text-sm mt-0.5">Manage your payments</Text>
          </View>
        </View>

        {/* Summary */}
        <View className="mx-5 mt-4 rounded-2xl p-5" style={{ backgroundColor: "#001A3D" }}>
          <Text style={{ color: "#9CA3AF", fontSize: 13 }}>Upcoming Bills</Text>
          <Text style={{ color: "#FFFFFF", fontSize: 28, fontWeight: "700", marginTop: 4 }}>
            {formatCurrency(totalUpcoming)}
          </Text>
          <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4 }}>
            {UPCOMING_BILLS.length} bills due this month
          </Text>
        </View>

        {/* Upcoming */}
        <View className="mx-5 mt-6">
          <Text className="text-foreground text-base font-semibold mb-3">Upcoming</Text>
          <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            {UPCOMING_BILLS.map((bill, idx) => (
              <View
                key={bill.id}
                className="flex-row items-center px-4 py-3.5"
                style={idx < UPCOMING_BILLS.length - 1 ? { borderBottomWidth: 0.5, borderBottomColor: colors.border } : {}}
              >
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(201, 169, 98, 0.08)", alignItems: "center", justifyContent: "center" }}>
                  <IconSymbol name="doc.text.fill" size={18} color="#C9A962" />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-foreground text-sm font-medium">{bill.payee}</Text>
                  <View className="flex-row items-center gap-2 mt-0.5">
                    <Text className="text-muted text-xs">Due {bill.dueDate}</Text>
                    {bill.autopay && (
                      <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(0, 88, 212, 0.1)" }}>
                        <Text style={{ color: "#0058D4", fontSize: 9, fontWeight: "600" }}>AUTO</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text className="text-foreground text-sm font-semibold">{formatCurrency(bill.amount)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recently Paid */}
        <View className="mx-5 mt-6">
          <Text className="text-foreground text-base font-semibold mb-3">Recently Paid</Text>
          <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            {PAID_BILLS.map((bill, idx) => (
              <View
                key={bill.id}
                className="flex-row items-center px-4 py-3.5"
                style={idx < PAID_BILLS.length - 1 ? { borderBottomWidth: 0.5, borderBottomColor: colors.border } : {}}
              >
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(34, 197, 94, 0.08)", alignItems: "center", justifyContent: "center" }}>
                  <IconSymbol name="checkmark" size={18} color={colors.success} />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-foreground text-sm font-medium">{bill.payee}</Text>
                  <Text className="text-muted text-xs mt-0.5">Paid {bill.paidDate}</Text>
                </View>
                <Text className="text-muted text-sm">{formatCurrency(bill.amount)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Add Bill */}
        <View className="mx-5 mt-6">
          <Pressable
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 16,
                borderRadius: 14,
                backgroundColor: "#C9A962",
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <IconSymbol name="plus" size={18} color="#001A3D" />
            <Text style={{ color: "#001A3D", fontSize: 15, fontWeight: "700", marginLeft: 8 }}>Add New Payee</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
