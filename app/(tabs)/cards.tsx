import { ScrollView, Text, View, Pressable, Dimensions } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState } from "react";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 40;

const CARDS = [
  {
    id: "1",
    type: "Debit",
    name: "Aldwych Premier Debit",
    number: "**** **** **** 4521",
    expiry: "09/28",
    holder: "CLIENT NAME",
    balance: 45892.67,
    color1: "#001A3D",
    color2: "#0058D4",
    frozen: false,
  },
  {
    id: "2",
    type: "Credit",
    name: "Aldwych Platinum Credit",
    number: "**** **** **** 8834",
    expiry: "12/27",
    holder: "CLIENT NAME",
    limit: 50000,
    used: 12450,
    color1: "#1C1C1C",
    color2: "#4A4A4A",
    frozen: false,
  },
];

const CARD_TRANSACTIONS = [
  { id: "1", merchant: "Apple Store", amount: -1299.99, date: "Jun 14", category: "Electronics" },
  { id: "2", merchant: "Whole Foods Market", amount: -156.78, date: "Jun 13", category: "Groceries" },
  { id: "3", merchant: "Uber", amount: -42.50, date: "Jun 12", category: "Transport" },
  { id: "4", merchant: "Netflix", amount: -22.99, date: "Jun 11", category: "Entertainment" },
];

export default function CardsScreen() {
  const colors = useColors();
  const [activeCard, setActiveCard] = useState(0);
  const [showCVV, setShowCVV] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(Math.abs(amount));
  };

  const card = CARDS[activeCard];

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-foreground text-2xl font-bold">Cards</Text>
          <Text className="text-muted text-sm mt-1">Manage your payment cards</Text>
        </View>

        {/* Card Visualization */}
        <View className="mx-5 mt-4">
          <View
            style={{
              width: CARD_WIDTH,
              height: CARD_WIDTH * 0.63,
              borderRadius: 20,
              padding: 24,
              justifyContent: "space-between",
              backgroundColor: card.color1,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            {/* Card Top */}
            <View className="flex-row items-center justify-between">
              <View>
                <Text style={{ color: "#C9A962", fontSize: 14, fontWeight: "700", letterSpacing: 1 }}>ALDWYCH</Text>
                <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 2 }}>{card.name}</Text>
              </View>
              <View
                style={{
                  width: 44,
                  height: 30,
                  borderRadius: 4,
                  backgroundColor: "rgba(201, 169, 98, 0.3)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View style={{ width: 28, height: 20, borderRadius: 3, backgroundColor: "#C9A962" }} />
              </View>
            </View>

            {/* Card Number */}
            <View>
              <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "500", letterSpacing: 3 }}>
                {card.number}
              </Text>
            </View>

            {/* Card Bottom */}
            <View className="flex-row items-end justify-between">
              <View>
                <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, letterSpacing: 1 }}>CARD HOLDER</Text>
                <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600", marginTop: 2 }}>{card.holder}</Text>
              </View>
              <View className="items-end">
                <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, letterSpacing: 1 }}>EXPIRES</Text>
                <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600", marginTop: 2 }}>{card.expiry}</Text>
              </View>
              <View className="items-end">
                <Text style={{ color: "#C9A962", fontSize: 16, fontWeight: "700" }}>
                  {card.type === "Credit" ? "VISA" : "MASTERCARD"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Card Selector Dots */}
        <View className="flex-row items-center justify-center mt-4 gap-2">
          {CARDS.map((_, idx) => (
            <Pressable
              key={idx}
              onPress={() => setActiveCard(idx)}
              style={({ pressed }) => [
                {
                  width: activeCard === idx ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: activeCard === idx ? "#C9A962" : colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            />
          ))}
        </View>

        {/* Card Info */}
        <View className="mx-5 mt-5 rounded-2xl p-4" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          {card.type === "Credit" ? (
            <View>
              <View className="flex-row justify-between items-center">
                <Text className="text-muted text-xs">Credit Used</Text>
                <Text className="text-muted text-xs">
                  {formatCurrency(card.used || 0)} / {formatCurrency(card.limit || 0)}
                </Text>
              </View>
              <View className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.border }}>
                <View
                  style={{
                    height: "100%",
                    width: `${((card.used || 0) / (card.limit || 1)) * 100}%`,
                    backgroundColor: "#C9A962",
                    borderRadius: 4,
                  }}
                />
              </View>
              <Text className="text-foreground text-lg font-bold mt-3">
                {formatCurrency((card.limit || 0) - (card.used || 0))} available
              </Text>
            </View>
          ) : (
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-muted text-xs">Linked Account Balance</Text>
                <Text className="text-foreground text-lg font-bold mt-1">{formatCurrency(card.balance || 0)}</Text>
              </View>
              <View className="px-3 py-1.5 rounded-full" style={{ backgroundColor: "rgba(34, 197, 94, 0.1)" }}>
                <Text style={{ color: colors.success, fontSize: 12, fontWeight: "600" }}>Active</Text>
              </View>
            </View>
          )}
        </View>

        {/* Card Controls */}
        <View className="mx-5 mt-4">
          <Text className="text-foreground text-sm font-semibold mb-3">Card Controls</Text>
          <View className="flex-row gap-3">
            {[
              { icon: "lock.fill" as const, title: "Freeze", subtitle: "Lock card" },
              { icon: "eye.fill" as const, title: "Details", subtitle: "View info" },
              { icon: "gearshape.fill" as const, title: "Limits", subtitle: "Set limits" },
              { icon: "shield.fill" as const, title: "PIN", subtitle: "Change PIN" },
            ].map((control, idx) => (
              <Pressable
                key={idx}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    alignItems: "center",
                    paddingVertical: 14,
                    borderRadius: 14,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <IconSymbol name={control.icon} size={20} color="#C9A962" />
                <Text className="text-foreground text-xs font-medium mt-2">{control.title}</Text>
                <Text className="text-muted text-xs">{control.subtitle}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Card Transactions */}
        <View className="mx-5 mt-6">
          <Text className="text-foreground text-sm font-semibold mb-3">Card Transactions</Text>
          <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            {CARD_TRANSACTIONS.map((txn, idx) => (
              <View
                key={txn.id}
                className="flex-row items-center px-4 py-3.5"
                style={idx < CARD_TRANSACTIONS.length - 1 ? { borderBottomWidth: 0.5, borderBottomColor: colors.border } : {}}
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
                  <IconSymbol name="creditcard.fill" size={18} color={colors.muted} />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-foreground text-sm font-medium">{txn.merchant}</Text>
                  <Text className="text-muted text-xs mt-0.5">{txn.date} · {txn.category}</Text>
                </View>
                <Text className="text-foreground text-sm font-semibold">
                  -{formatCurrency(txn.amount)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
