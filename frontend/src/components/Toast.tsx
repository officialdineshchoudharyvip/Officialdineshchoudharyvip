import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle, WarningCircle, Info } from "phosphor-react-native";

import { colors, fonts, radius, spacing, shadow } from "@/src/theme";

type ToastType = "success" | "error" | "info";
type ToastCtx = { show: (msg: string, type?: ToastType) => void };

const Ctx = createContext<ToastCtx>({ show: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState("");
  const [type, setType] = useState<ToastType>("info");
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, t: ToastType = "info") => {
      setMsg(message);
      setType(t);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
      ]).start();
      hideTimer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -20, duration: 220, useNativeDriver: true }),
        ]).start();
      }, 2600);
    },
    [opacity, translateY],
  );

  const accent =
    type === "success" ? colors.success : type === "error" ? colors.error : colors.brand;
  const Icon = type === "success" ? CheckCircle : type === "error" ? WarningCircle : Info;

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.wrap,
          { top: insets.top + spacing.sm, opacity, transform: [{ translateY }] },
        ]}
      >
        <View style={styles.toast} testID="app-toast">
          <Icon size={22} color={accent} weight="fill" />
          <Text style={styles.text} numberOfLines={2}>
            {msg}
          </Text>
        </View>
      </Animated.View>
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "center",
    zIndex: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    maxWidth: "100%",
    ...shadow.card,
  },
  text: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 14, color: colors.onSurface },
});
