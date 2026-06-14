import { ScrollView, Text, View, Pressable, TextInput, Image, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState } from "react";

export default function SignUpScreen() {
  const colors = useColors();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleSignUp = () => {
    router.replace("/(tabs)");
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="flex-row items-center mb-6">
            <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, marginRight: 12 }]}>
              <IconSymbol name="chevron.right" size={22} color={colors.foreground} style={{ transform: [{ rotate: "180deg" }] }} />
            </Pressable>
            <View>
              <Text className="text-foreground text-2xl font-bold">Open an Account</Text>
              <Text className="text-muted text-sm mt-0.5">Join Aldwych European Capital</Text>
            </View>
          </View>

          {/* Form */}
          <View className="gap-4">
            {/* Name Row */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-foreground text-sm font-medium mb-2">First Name</Text>
                <View
                  className="px-4 rounded-xl justify-center"
                  style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, height: 50 }}
                >
                  <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="John"
                    placeholderTextColor={colors.muted}
                    style={{ color: colors.foreground, fontSize: 15 }}
                  />
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-foreground text-sm font-medium mb-2">Last Name</Text>
                <View
                  className="px-4 rounded-xl justify-center"
                  style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, height: 50 }}
                >
                  <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Smith"
                    placeholderTextColor={colors.muted}
                    style={{ color: colors.foreground, fontSize: 15 }}
                  />
                </View>
              </View>
            </View>

            {/* Email */}
            <View>
              <Text className="text-foreground text-sm font-medium mb-2">Email Address</Text>
              <View
                className="flex-row items-center px-4 rounded-xl"
                style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, height: 50 }}
              >
                <IconSymbol name="person.fill" size={16} color={colors.muted} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@email.com"
                  placeholderTextColor={colors.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{ flex: 1, marginLeft: 10, color: colors.foreground, fontSize: 15 }}
                />
              </View>
            </View>

            {/* Phone */}
            <View>
              <Text className="text-foreground text-sm font-medium mb-2">Phone Number</Text>
              <View
                className="flex-row items-center px-4 rounded-xl"
                style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, height: 50 }}
              >
                <Text className="text-muted text-sm">+1</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="(416) 555-0123"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                  style={{ flex: 1, marginLeft: 10, color: colors.foreground, fontSize: 15 }}
                />
              </View>
            </View>

            {/* Password */}
            <View>
              <Text className="text-foreground text-sm font-medium mb-2">Password</Text>
              <View
                className="flex-row items-center px-4 rounded-xl"
                style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, height: 50 }}
              >
                <IconSymbol name="lock.fill" size={16} color={colors.muted} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min 8 characters"
                  placeholderTextColor={colors.muted}
                  secureTextEntry={!showPassword}
                  style={{ flex: 1, marginLeft: 10, color: colors.foreground, fontSize: 15 }}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
                  <IconSymbol name={showPassword ? "eye.slash.fill" : "eye.fill"} size={18} color={colors.muted} />
                </Pressable>
              </View>
            </View>

            {/* Confirm Password */}
            <View>
              <Text className="text-foreground text-sm font-medium mb-2">Confirm Password</Text>
              <View
                className="flex-row items-center px-4 rounded-xl"
                style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, height: 50 }}
              >
                <IconSymbol name="lock.fill" size={16} color={colors.muted} />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter password"
                  placeholderTextColor={colors.muted}
                  secureTextEntry
                  style={{ flex: 1, marginLeft: 10, color: colors.foreground, fontSize: 15 }}
                />
              </View>
            </View>

            {/* Terms */}
            <Pressable
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              style={({ pressed }) => [{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 4, opacity: pressed ? 0.8 : 1 }]}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: agreedToTerms ? "#C9A962" : colors.border,
                  backgroundColor: agreedToTerms ? "#C9A962" : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 1,
                }}
              >
                {agreedToTerms && <IconSymbol name="checkmark" size={14} color="#001A3D" />}
              </View>
              <Text className="text-muted text-xs flex-1 leading-4">
                I agree to the Terms of Service, Privacy Policy, and consent to electronic communications from Aldwych European Capital.
              </Text>
            </Pressable>

            {/* Submit */}
            <Pressable
              onPress={handleSignUp}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 16,
                  borderRadius: 14,
                  backgroundColor: agreedToTerms ? "#C9A962" : "rgba(201, 169, 98, 0.3)",
                  opacity: pressed ? 0.9 : 1,
                  marginTop: 8,
                },
              ]}
            >
              <Text style={{ color: "#001A3D", fontSize: 16, fontWeight: "700" }}>Create Account</Text>
            </Pressable>
          </View>

          {/* Sign In Link */}
          <View className="flex-row items-center justify-center mt-6">
            <Text className="text-muted text-sm">Already have an account? </Text>
            <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
              <Text style={{ color: "#C9A962", fontSize: 14, fontWeight: "600" }}>Sign In</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
