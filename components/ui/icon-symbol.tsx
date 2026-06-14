// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * SF Symbols to Material Icons mappings for the banking app.
 */
const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "creditcard.fill": "credit-card",
  "arrow.left.arrow.right": "swap-horiz",
  "building.columns.fill": "account-balance",
  "ellipsis.circle.fill": "more-horiz",
  "person.fill": "person",
  "gearshape.fill": "settings",
  "shield.fill": "security",
  "questionmark.circle.fill": "help",
  "bell.fill": "notifications",
  "chart.line.uptrend.xyaxis": "trending-up",
  "doc.text.fill": "description",
  "arrow.down.circle.fill": "file-download",
  "magnifyingglass": "search",
  "xmark": "close",
  "plus": "add",
  "minus": "remove",
  "checkmark": "check",
  "eye.fill": "visibility",
  "eye.slash.fill": "visibility-off",
  "lock.fill": "lock",
  "faceid": "fingerprint",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
