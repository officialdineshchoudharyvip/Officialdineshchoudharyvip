import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { MagicWand, ImageSquare, Flower, ArrowClockwise, PencilSimple } from "phosphor-react-native";

import { api, Template } from "@/src/api";
import { setEditorSeed } from "@/src/editorStore";
import { colors, fonts, radius, shadow, spacing } from "@/src/theme";

const { width } = Dimensions.get("window");
const CARD_GAP = spacing.md;
const GRID_W = (width - spacing.lg * 2 - CARD_GAP) / 2;

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const t = await api.getTemplates();
      setTemplates(t);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEditorBlank = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditorSeed(null);
    router.push("/editor");
  };

  const openTemplate = (t: Template) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEditorSeed({ uri: t.url });
    router.push("/editor");
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.brandRow}>
          <Flower size={26} color={colors.brand} weight="fill" />
          <Text style={styles.brand}>InstaBloom</Text>
        </View>
        <Text style={styles.tagline}>Turn any photo into a bloom-worthy post</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={load} tintColor={colors.brand} />
        }
      >
        <View style={styles.actionRow}>
          <Pressable
            testID="home-ai-bloom-card"
            style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/generate");
            }}
          >
            <LinearGradient
              colors={[colors.brand, colors.brandSecondary]}
              style={styles.actionInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MagicWand size={30} color="#FFFFFF" weight="fill" />
              <Text style={styles.actionTitle}>AI Bloom</Text>
              <Text style={styles.actionSub}>Generate flowers from text</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            testID="home-photo-edit-card"
            style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
            onPress={openEditorBlank}
          >
            <View style={[styles.actionInner, styles.actionInnerAlt]}>
              <ImageSquare size={30} color={colors.brand} weight="fill" />
              <Text style={[styles.actionTitle, { color: colors.onSurface }]}>Photo Edit</Text>
              <Text style={[styles.actionSub, { color: colors.muted }]}>
                Frames, stickers & text
              </Text>
            </View>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Trending templates</Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.brand} size="large" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Flower size={56} color={colors.brandSecondary} weight="duotone" />
            <Text style={styles.emptyTitle}>Oops, the flowers didn&apos;t bloom</Text>
            <Pressable style={styles.retryBtn} onPress={load} testID="home-retry-button">
              <ArrowClockwise size={18} color={colors.onBrandPrimary} weight="bold" />
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.grid}>
            {templates.map((t) => (
              <Pressable
                key={t.id}
                testID={`template-card-${t.id}`}
                style={({ pressed }) => [styles.gridCard, pressed && styles.pressed]}
                onPress={() => openTemplate(t)}
              >
                <Image source={{ uri: t.url }} style={styles.gridImg} contentFit="cover" transition={200} />
                <LinearGradient
                  colors={["transparent", "rgba(31,26,28,0.85)"]}
                  style={styles.gridScrim}
                />
                <View style={styles.gridFooter}>
                  <Text style={styles.gridTitle}>{t.title}</Text>
                  <View style={styles.gridEdit}>
                    <PencilSimple size={14} color="#FFFFFF" weight="bold" />
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  brand: { fontFamily: fonts.display, fontSize: 26, color: colors.onSurface },
  tagline: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginTop: 2 },

  actionRow: { flexDirection: "row", gap: CARD_GAP },
  actionCard: { flex: 1, borderRadius: radius.lg, overflow: "hidden", ...shadow.card },
  actionInner: {
    height: 130,
    padding: spacing.lg,
    justifyContent: "flex-end",
    gap: 2,
  },
  actionInnerAlt: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionTitle: { fontFamily: fonts.displaySemi, fontSize: 18, color: "#FFFFFF" },
  actionSub: { fontFamily: fonts.body, fontSize: 12, color: "rgba(255,255,255,0.9)" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },

  sectionTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    color: colors.onSurface,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: CARD_GAP },
  gridCard: {
    width: GRID_W,
    height: GRID_W * 1.25,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surfaceTertiary,
    ...shadow.soft,
  },
  gridImg: { width: "100%", height: "100%" },
  gridScrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: "55%" },
  gridFooter: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gridTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#FFFFFF", flex: 1 },
  gridEdit: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },

  center: { alignItems: "center", justifyContent: "center", paddingVertical: spacing["3xl"], gap: spacing.md },
  emptyTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.muted },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  retryText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.onBrandPrimary },
});
