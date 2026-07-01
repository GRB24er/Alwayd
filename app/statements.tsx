import {
  FlatList,
  Text,
  View,
  Pressable,
  Platform,
  ActivityIndicator,
  Share,
  Image,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState, useEffect } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useBankAuth } from "@/lib/auth-context";
import {
  getTransactions,
  getDashboard,
  type BankTransaction,
  type BankUser,
  type BankBalances,
} from "@/lib/banking-api";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

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
    const period = date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

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

function buildStatementPayload(
  user: BankUser,
  transactions: BankTransaction[],
  statement: StatementItem,
  balances: BankBalances
) {
  let runningBalance = balances.checking;
  const totalCredits = transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const openingBalance = balances.checking - totalCredits + totalDebits;

  let balance = openingBalance;
  const txRows = transactions.map((t) => {
    const isDebit = t.amount < 0;
    balance += t.amount;
    return {
      date: t.date,
      description: t.description,
      debit: isDebit ? Math.abs(t.amount) : undefined,
      credit: !isDebit ? t.amount : undefined,
      balance,
    };
  });

  const accountNum = user.accountNumber || "0000-4521";
  const accountLabel =
    statement.accountType.charAt(0).toUpperCase() +
    statement.accountType.slice(1);

  return {
    accountHolder: {
      name: user.name || `${user.firstName} ${user.lastName}`,
      addressLine1: user.email,
    },
    account: {
      name: `${accountLabel} Account`,
      number: accountNum,
      type: "Private Banking",
      currency: "USD",
    },
    period: {
      startDate: statement.startDate,
      endDate: statement.endDate,
      label: statement.period,
    },
    summary: {
      openingBalance,
      totalDebits,
      totalCredits,
      closingBalance: balances.checking,
    },
    transactions: txRows,
    bankInfo: {
      branchName: "PRIVATE BANKING OFFICE",
      branchAddress: "Aldwych House, 71-91 Aldwych",
      phone: "+44 (0)20 7946 0000",
      website: "www.aldwycheuropeancapital.com",
      plan: "Private Banking Premier",
    },
  };
}

export default function StatementsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useBankAuth();
  const [statements, setStatements] = useState<StatementItem[]>([]);
  const [activeTab, setActiveTab] = useState<
    "checking" | "savings" | "investment"
  >("checking");
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    setStatements(generateStatementList());
  }, []);

  const filteredStatements = statements.filter(
    (s) => s.accountType === activeTab
  );

  async function handleDownloadStatement(statement: StatementItem) {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setGeneratingId(statement.id);

    try {
      const [dashData, txData] = await Promise.all([
        getDashboard(),
        getTransactions({
          accountType: statement.accountType,
          from: statement.startDate,
          to: statement.endDate,
          limit: 200,
        }),
      ]);

      const payload = buildStatementPayload(
        dashData.user,
        txData.transactions,
        statement,
        txData.balances || dashData.balances
      );

      if (Platform.OS === "web") {
        await downloadStatementWeb(payload, statement);
      } else {
        await downloadStatementNative(payload, statement);
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      console.error("Statement generation failed:", error);

      // Fallback to text-based share
      const statementText = generateStatementText(statement);
      try {
        await Share.share({
          title: `Statement - ${statement.period}`,
          message: statementText,
        });
      } catch {
        Alert.alert(
          "Statement Error",
          "Unable to generate your statement. Please try again later."
        );
      }
    } finally {
      setGeneratingId(null);
    }
  }

  async function downloadStatementWeb(payload: any, statement: StatementItem) {
    const { getBaseUrl } = await import("@/lib/banking-api");
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/api/statement/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("PDF generation failed");

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AEC_Statement_${statement.period.replace(/\s+/g, "_")}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function downloadStatementNative(
    payload: any,
    statement: StatementItem
  ) {
    const { getBaseUrl } = await import("@/lib/banking-api");
    const baseUrl = await getBaseUrl();
    const filename = `AEC_Statement_${statement.period.replace(/\s+/g, "_")}.pdf`;
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    const downloadResult = await FileSystem.downloadAsync(
      `${baseUrl}/api/statement/generate`,
      fileUri,
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    if (downloadResult.status !== 200) {
      // Fall back to POST via uploadAsync
      const response = await FileSystem.uploadAsync(
        `${baseUrl}/api/statement/generate`,
        fileUri,
        {
          httpMethod: "POST",
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: { "Content-Type": "application/json" },
          fieldName: "file",
        }
      );
    }

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/pdf",
        dialogTitle: `Statement - ${statement.period}`,
      });
    }
  }

  function generateStatementText(statement: StatementItem): string {
    const accountLabel =
      statement.accountType.charAt(0).toUpperCase() +
      statement.accountType.slice(1);
    const accountNum = user?.accountNumber
      ? `----${user.accountNumber.slice(-4)}`
      : "----4521";

    return [
      "====================================================",
      "           ALDWYCH EUROPEAN CAPITAL",
      "              Account Statement",
      "====================================================",
      "",
      `Statement Period:  ${statement.period}`,
      `Account Type:      ${accountLabel} Account`,
      `Account Number:    ${accountNum}`,
      `Account Holder:    ${user?.name || "Account Holder"}`,
      "",
      "----------------------------------------------------",
      `Statement Date:    ${statement.startDate} to ${statement.endDate}`,
      `Transactions:      ${statement.transactionCount}`,
      "----------------------------------------------------",
      "",
      "For the full detailed PDF statement with all",
      "transactions, please connect to your Aldwych",
      "European Capital web portal.",
      "",
      "====================================================",
      "",
      "Aldwych European Capital",
      "Aldwych House, 71-91 Aldwych, London WC2B 4HN",
      "Tel: +44 (0)20 7946 0000",
      "Email: statements@aldwycheuropeancapital.com",
      "",
      "Authorised and regulated by the Financial Conduct",
      "Authority (FCA) and the Prudential Regulation",
      "Authority (PRA). Reg. No. 09876543.",
      "",
      "====================================================",
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
        style={({ pressed }) => [
          {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 16,
            borderBottomWidth: 0.5,
            borderBottomColor: colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: "rgba(13, 36, 64, 0.06)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name="picture-as-pdf" size={20} color="#0D2440" />
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: colors.foreground,
            }}
          >
            {item.period}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginTop: 3,
            }}
          >
            <Text style={{ fontSize: 12, color: colors.muted }}>
              PDF Statement
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>·</Text>
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
                backgroundColor:
                  item.status === "ready"
                    ? "rgba(16, 185, 129, 0.08)"
                    : "rgba(201, 169, 98, 0.1)",
              }}
            >
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "600",
                  color: item.status === "ready" ? "#10B981" : "#C9A962",
                  textTransform: "uppercase",
                }}
              >
                {item.status === "ready" ? "Available" : "Processing"}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ alignItems: "center", justifyContent: "center" }}>
          {isGenerating ? (
            <ActivityIndicator size="small" color="#C9A962" />
          ) : (
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: "rgba(201, 169, 98, 0.1)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
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
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            { opacity: pressed ? 0.6 : 1, marginRight: 12 },
          ]}
        >
          <IconSymbol
            name="chevron.right"
            size={22}
            color={colors.foreground}
            style={{ transform: [{ rotate: "180deg" }] }}
          />
        </Pressable>
        <View className="flex-1">
          <Text className="text-foreground text-2xl font-bold">Statements</Text>
          <Text className="text-muted text-sm mt-0.5">
            Download official PDF statements
          </Text>
        </View>
      </View>

      {/* Logo Banner */}
      <View
        style={{
          marginHorizontal: 20,
          marginTop: 12,
          backgroundColor: "#0D2440",
          borderRadius: 12,
          padding: 16,
          alignItems: "center",
        }}
      >
        <Image
          source={require("@/assets/images/logo-full.png")}
          style={{ width: 180, height: 40 }}
          resizeMode="contain"
        />
        <View
          style={{
            height: 1.5,
            width: "100%",
            backgroundColor: "#C9A84C",
            marginTop: 12,
          }}
        />
        <Text
          style={{
            color: "rgba(201, 168, 76, 0.7)",
            fontSize: 9,
            letterSpacing: 2,
            marginTop: 8,
          }}
        >
          OFFICIAL ACCOUNT STATEMENTS
        </Text>
      </View>

      {/* Account Tabs */}
      <View
        style={{
          flexDirection: "row",
          marginHorizontal: 20,
          marginTop: 16,
          gap: 8,
        }}
      >
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={({ pressed }) => [
              {
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor:
                  activeTab === tab.key ? "#C9A962" : colors.surface,
                borderWidth: 1,
                borderColor:
                  activeTab === tab.key ? "#C9A962" : colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: activeTab === tab.key ? "#001A3D" : colors.muted,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Statement List */}
      <View style={{ flex: 1, marginTop: 12, marginHorizontal: 20 }}>
        <View
          style={{
            borderRadius: 16,
            overflow: "hidden",
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            flex: 1,
          }}
        >
          <FlatList
            data={filteredStatements}
            renderItem={renderStatement}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ padding: 40, alignItems: "center" }}>
                <MaterialIcons
                  name="folder-open"
                  size={40}
                  color={colors.muted}
                />
                <Text
                  style={{ color: colors.muted, fontSize: 14, marginTop: 12 }}
                >
                  No statements available
                </Text>
              </View>
            }
          />
        </View>
      </View>

      {/* Footer Note */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
        <Text
          style={{
            fontSize: 10,
            color: colors.muted,
            textAlign: "center",
            lineHeight: 14,
          }}
        >
          Statements are generated as professional PDF documents with official
          Aldwych European Capital branding. They can be used as proof of account
          activity.
        </Text>
      </View>
    </ScreenContainer>
  );
}
