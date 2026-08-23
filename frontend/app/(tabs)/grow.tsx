import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Copy, Hash, Quotes, TrendUp } from "phosphor-react-native";

import { useToast } from "@/src/components/Toast";
import { colors, fonts, radius, shadow, spacing } from "@/src/theme";

const HASHTAG_PACKS = [
  {
    id: "general",
    title: "General Blooms",
    tags: ["#flowers", "#flowerstagram", "#flowersofinstagram", "#floral", "#bloom", "#petals", "#flowerlovers", "#naturelovers", "#flowermagic", "#instaflowers"],
  },
  {
    id: "roses",
    title: "Roses",
    tags: ["#roses", "#roselover", "#rosegarden", "#redroses", "#roseoftheday", "#flowerphotography", "#rosepetals", "#floralbeauty", "#rosesofinstagram", "#flowerlove"],
  },
  {
    id: "spring",
    title: "Spring Vibes",
    tags: ["#springflowers", "#springvibes", "#blossom", "#cherryblossom", "#springtime", "#freshflowers", "#gardenlife", "#bloomingflowers", "#pastelflowers", "#springmood"],
  },
  {
    id: "wedding",
    title: "Wedding & Bouquet",
    tags: ["#bouquet", "#weddingflowers", "#floraldesign", "#flowerarrangement", "#bridalbouquet", "#florist", "#weddinginspo", "#flowersofinsta", "#eventflowers", "#floralstyling"],
  },
  {
    id: "aesthetic",
    title: "Aesthetic",
    tags: ["#aesthetic", "#floweraesthetic", "#softaesthetic", "#cottagecore", "#flowerfeed", "#dreamy", "#prettylittlethings", "#moodygrams", "#flatlay", "#flowerinspo"],
  },
];

const CAPTIONS = [
  "Bloom where you are planted 🌷",
  "Petals, positivity & good vibes 🌸",
  "Life is better with flowers in your hair 🌺",
  "Every flower is a soul blossoming in nature 🌻",
  "Collecting moments, not things 🌷✨",
  "Stop and smell the roses 🌹",
  "Grow through what you go through 🌱",
  "A little bloom goes a long way 🌼",
];

export default function Grow() {
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const copy = async (text: string, label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(text);
    toast.show(`${label} copied`, "success");
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.titleRow}>
          <TrendUp size={24} color={colors.brand} weight="fill" />
          <Text style={styles.title}>Grow</Text>
        </View>
        <Text style={styles.subtitle}>Reach more people & gain followers faster</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHead}>
          <Hash size={18} color={colors.onSurface} weight="bold" />
          <Text style={styles.sectionTitle}>Trending hashtag packs</Text>
        </View>
        <Text style={styles.sectionHint}>Tap Copy and paste into your caption or first comment</Text>

        {HASHTAG_PACKS.map((pack) => (
          <View key={pack.id} style={styles.card} testID={`hashtag-pack-${pack.id}`}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>{pack.title}</Text>
              <Pressable
                style={styles.copyBtn}
                onPress={() => copy(pack.tags.join(" "), pack.title)}
                testID={`copy-hashtags-${pack.id}`}
              >
                <Copy size={16} color={colors.onBrandPrimary} weight="bold" />
                <Text style={styles.copyText}>Copy</Text>
              </Pressable>
            </View>
            <View style={styles.tagWrap}>
              {pack.tags.map((t) => (
                <View key={t} style={styles.tagChip}>
                  <Text style={styles.tagText}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={[styles.sectionHead, { marginTop: spacing.xl }]}>
          <Quotes size={18} color={colors.onSurface} weight="bold" />
          <Text style={styles.sectionTitle}>Caption ideas</Text>
        </View>
        <Text style={styles.sectionHint}>Tap any caption to copy it</Text>

        {CAPTIONS.map((c, i) => (
          <Pressable
            key={i}
            style={styles.captionCard}
            onPress={() => copy(c, "Caption")}
            testID={`caption-${i}`}
          >
            <Text style={styles.captionText}>{c}</Text>
            <Copy size={18} color={colors.brand} weight="bold" />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { fontFamily: fonts.display, fontSize: 26, color: colors.onSurface },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginTop: 2 },

  sectionHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs },
  sectionTitle: { fontFamily: fonts.displaySemi, fontSize: 18, color: colors.onSurface },
  sectionHint: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginBottom: spacing.md },

  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.onSurface },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.brand,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  copyText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.onBrandPrimary },
  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tagChip: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  tagText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.onSurfaceTertiary },

  captionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  captionText: { fontFamily: fonts.body, fontSize: 15, color: colors.onSurface, flex: 1 },
});
