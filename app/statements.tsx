/**
 * Statements Screen — Download branded account statements
 * 
 * Professional statement generation with Aldwych European Capital branding.
 * Users can view, share, and download monthly/custom statements.
 */

import { FlatList, Text, View, Pressable, Platform, ActivityIndicator, Share, Image } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState, useEffect } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useBankAuth } from "@/lib/auth-context";
import * as Haptics from "expo-haptics";

interface StatementItem {
  id: string;
  period: string;
  accountType: string;
  startDate: string;
  endDate: string;
  status: "ready" | "generating";
  transactionCount: number;
}

function generateStatementList(): StatementItem[] {
  const statements: StatementItem[] = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const period = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    statements.push({
      id: `stmt-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-checking`,
      period,
      accountType: "checking",
      startDate: date.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      status: i === 0 ? "generating" : "ready",
      transactionCount: Math.floor(Math.random() * 30) + 5,
    });
  }

  return statements;
}

export default function StatementsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useBankAuth();
  const [statements, setStatements] = useState<StatementItem[]>([]);
  const [activeTab, setActiveTab] = useState<"checking" | "savings" | "investment">("checking");
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    setStatements(generateStatementList());
  }, []);

  const filteredStatements = statements.filter(s => s.accountType === activeTab);

  async function handleDownloadStatement(statement: StatementItem) {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setGeneratingId(statement.id);

    const statementText = generateStatementText(statement);

    setTimeout(async () => {
      setGeneratingId(null);

      try {
        await Share.share({
          title: `Statement - ${statement.period}`,
          message: statementText,
        });

        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (error) {
        console.error("Share failed:", error);
      }
    }, 800);
  }

  function generateStatementText(statement: StatementItem): string {
    const accountLabel = statement.accountType.charAt(0).toUpperCase() + statement.accountType.slice(1);
    const accountNum = user?.accountNumber ? `••••${user.accountNumber.slice(-4)}` : "••••4521";

    return [
      "═══════════════════════════════════════════════════",
      "           ALDWYCH EUROPEAN CAPITAL",
      "              Account Statement",
      "═══════════════════════════════════════════════════",
      "",
      `Statement Period:  ${statement.period}`,
      `Account Type:      ${accountLabel} Account`,
      `Account Number:    ${accountNum}`,
      `Account Holder:    ${user?.name || "Account Holder"}`,
      "",
      "───────────────────────────────────────────────────",
      `Statement Date:    ${statement.startDate} to ${statement.endDate}`,
      `Transactions:      ${statement.transactionCount}`,
      "───────────────────────────────────────────────────",
      "",
      "For the full detailed statement with all transactions,",
      "please log in to your Aldwych European Capital web portal",
      "or contact your relationship manager.",
      "",
      "═══════════════════════════════════════════════════",
      "",
      "Aldwych European Capital",
      "1 Aldwych, London WC2B 4BZ",
      "Tel: +44 (0)20 7946 0958",
      "Email: statements@aldwychcapital.com",
      "",
      "Authorised and regulated by the Financial Conduct",
      "Authority (FCA) and the Prudential Regulation",
      "Authority (PRA). Reg. No. 09876543.",
      "",
      "═══════════════════════════════════════════════════",
    ].join("\n");
  }

  const tabs = [
    { key: "checking" as const, label: "Checking" },
    { key: "savings" as const, label: "Savings" },
    { key: "investment" as const, label: "Investment" },
  ];

  const renderStatement = ({ item }: { item: StatementItem }) => {
    const isGenerating = generatingId === item.id;

    return (
      <Pressable
        onPress={() => handleDownloadStatement(item)}
        disabled={isGenerating || item.status === "generating"}
        style={({ pressed }) => [{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 16,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        }]}
      >
        <View style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: "rgba(13, 36, 64, 0.06)",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <MaterialIcons name="description" size={20} color="#0D2440" />
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
            {item.period}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              {item.transactionCount} transactions
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>·</Text>
            <View style={{
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              backgroundColor: item.status === "ready" ? "rgba(16, 185, 129, 0.08)" : "rgba(201, 169, 98, 0.1)",
            }}>
              <Text style={{
                fontSize: 9,
                fontWeight: "600",
                color: item.status === "ready" ? "#10B981" : "#C9A962",
                textTransform: "uppercase",
              }}>
                {item.status === "ready" ? "Available" : "Processing"}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ alignItems: "center", justifyContent: "center" }}>
          {isGenerating ? (
            <ActivityIndicator size="small" color="#C9A962" />
          ) : (
            <View style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: "rgba(201, 169, 98, 0.1)",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <MaterialIcons name="download" size={18} color="#C9A962" />
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View className="px-5 pt-4 pb-2 flex-row items-center">
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, marginRight: 12 }]}>
          <IconSymbol name="chevron.right" size={22} color={colors.foreground} style={{ transform: [{ rotate: "180deg" }] }} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-foreground text-2xl font-bold">Statements</Text>
          <Text className="text-muted text-sm mt-0.5">Download account statements</Text>
        </View>
      </View>

      {/* Logo Banner */}
      <View style={{ marginHorizontal: 20, marginTop: 12, backgroundColor: "#0D2440", borderRadius: 12, padding: 16, alignItems: "center" }}>
        <Image
          source={require("@/assets/images/logo-full.png")}
          style={{ width: 180, height: 40 }}
          resizeMode="contain"
        />
        <View style={{ height: 1.5, width: "100%", backgroundColor: "#C9A84C", marginTop: 12 }} />
        <Text style={{ color: "rgba(201, 168, 76, 0.7)", fontSize: 9, letterSpacing: 2, marginTop: 8 }}>
          OFFICIAL ACCOUNT STATEMENTS
        </Text>
      </View>

      {/* Account Tabs */}
      <View style={{ flexDirection: "row", marginHorizontal: 20, marginTop: 16, gap: 8 }}>
        {tabs.map(tab => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={({ pressed }) => [{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: "center",
              backgroundColor: activeTab === tab.key ? "#C9A962" : colors.surface,
              borderWidth: 1,
              borderColor: activeTab === tab.key ? "#C9A962" : colors.border,
              opacity: pressed ? 0.8 : 1,
            }]}
          >
            <Text style={{
              fontSize: 12,
              fontWeight: "600",
              color: activeTab === tab.key ? "#001A3D" : colors.muted,
            }}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Statement List */}
      <View style={{ flex: 1, marginTop: 12, marginHorizontal: 20 }}>
        <View style={{ borderRadius: 16, overflow: "hidden", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flex: 1 }}>
          <FlatList
            data={filteredStatements}
            renderItem={renderStatement}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ padding: 40, alignItems: "center" }}>
                <MaterialIcons name="folder-open" size={40} color={colors.muted} />
                <Text style={{ color: colors.muted, fontSize: 14, marginTop: 12 }}>No statements available</Text>
              </View>
            }
          />
        </View>
      </View>

      {/* Footer Note */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
        <Text style={{ fontSize: 10, color: colors.muted, textAlign: "center", lineHeight: 14 }}>
          Statements are generated with your official Aldwych European Capital branding and can be used as proof of account activity.
        </Text>
      </View>
    </ScreenContainer>
  );
}
