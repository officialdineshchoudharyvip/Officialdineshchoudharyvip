import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { MagicWand, DownloadSimple, PencilSimple, Sparkle } from "phosphor-react-native";

import { api } from "@/src/api";
import { setEditorSeed } from "@/src/editorStore";
import { base64ToTempFile, saveToDevice } from "@/src/media";
import { useToast } from "@/src/components/Toast";
import { colors, fonts, radius, shadow, spacing } from "@/src/theme";

const STYLES = [
  { key: "dreamy", label: "Dreamy" },
  { key: "watercolor", label: "Watercolor" },
  { key: "minimal", label: "Minimal" },
  { key: "vintage", label: "Vintage" },
  { key: "bold", label: "Bold" },
];

const IDEAS = [
  "A field of pink peonies at sunrise",
  "Roses and eucalyptus bouquet on marble",
  "Cherry blossoms falling over a pastel sky",
  "Wildflowers in a vintage glass jar",
  "Lavender fields under golden light",
];

export default function Generate() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("dreamy");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const dataUri = result ? `data:image/png;base64,${result}` : null;

  const generate = async () => {
    if (!prompt.trim()) {
      toast.show("Type an idea first", "info");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setResult(null);
    try {
      const res = await api.generate(prompt.trim(), style);
      setResult(res.image_base64);
      await api.saveCreation("ai", res.image_base64, prompt.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      toast.show(e?.message || "Generation failed, try another phrase", "error");
    } finally {
      setLoading(false);
    }
  };

  const saveDevice = async () => {
    if (!result) return;
    const uri = await base64ToTempFile(result);
    const r = await saveToDevice(uri);
    if (r === "saved") toast.show("Saved to your photos", "success");
    else if (r === "blocked") {
      toast.show("Enable photo access in Settings", "error");
      Linking.openSettings();
    } else if (r === "denied") toast.show("Photo permission needed", "error");
    else toast.show("Could not save", "error");
  };

  const editInStudio = () => {
    if (!result) return;
    setEditorSeed({ base64: result });
    router.push("/editor");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>AI Bloom</Text>
        <Text style={styles.subtitle}>Describe your dream floral post</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TextInput
          testID="generate-prompt-input"
          value={prompt}
          onChangeText={setPrompt}
          placeholder="e.g. A field of pink peonies at sunrise"
          placeholderTextColor={colors.muted}
          multiline
          style={styles.input}
        />

        {!prompt.trim() && (
          <>
            <Text style={styles.hint}>Need inspiration?</Text>
            <View style={styles.ideaWrap}>
              {IDEAS.map((idea) => (
                <Pressable
                  key={idea}
                  testID={`idea-chip-${idea.slice(0, 8)}`}
                  style={styles.ideaChip}
                  onPress={() => setPrompt(idea)}
                >
                  <Sparkle size={13} color={colors.brand} weight="fill" />
                  <Text style={styles.ideaText}>{idea}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={styles.hint}>Style</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.styleRow}
        >
          {STYLES.map((s) => {
            const active = s.key === style;
            return (
              <Pressable
                key={s.key}
                testID={`style-chip-${s.key}`}
                onPress={() => {
                  Haptics.selectionAsync();
                  setStyle(s.key);
                }}
                style={[styles.styleChip, active && styles.styleChipActive]}
              >
                <Text style={[styles.styleText, active && styles.styleTextActive]}>{s.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.preview}>
          {loading ? (
            <View style={styles.previewCenter}>
              <ActivityIndicator color={colors.brand} size="large" />
              <Text style={styles.previewText}>Planting seeds...</Text>
            </View>
          ) : dataUri ? (
            <Image source={{ uri: dataUri }} style={styles.previewImg} contentFit="cover" />
          ) : (
            <View style={styles.previewCenter}>
              <MagicWand size={44} color={colors.brandSecondary} weight="duotone" />
              <Text style={styles.previewText}>Your creation appears here</Text>
            </View>
          )}
        </View>

        {result && !loading && (
          <View style={styles.resultActions}>
            <Pressable style={styles.secondaryBtn} onPress={saveDevice} testID="generate-save-button">
              <DownloadSimple size={20} color={colors.brand} weight="bold" />
              <Text style={styles.secondaryText}>Save</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={editInStudio} testID="generate-edit-button">
              <PencilSimple size={20} color={colors.brand} weight="bold" />
              <Text style={styles.secondaryText}>Edit in Studio</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable
          testID="generate-button"
          disabled={loading}
          onPress={generate}
          style={({ pressed }) => [styles.generateBtn, (pressed || loading) && { opacity: 0.7 }]}
        >
          <MagicWand size={22} color={colors.onBrandPrimary} weight="fill" />
          <Text style={styles.generateText}>{loading ? "Generating..." : "Generate"}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  title: { fontFamily: fonts.display, fontSize: 26, color: colors.onSurface },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginTop: 2 },

  input: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    minHeight: 90,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.onSurfaceTertiary,
    textAlignVertical: "top",
  },
  hint: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.muted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  ideaWrap: { gap: spacing.sm },
  ideaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  ideaText: { fontFamily: fonts.body, fontSize: 14, color: colors.onSurface, flex: 1 },

  styleRow: { gap: spacing.sm, paddingRight: spacing.lg },
  styleChip: {
    height: 40,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  styleChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  styleText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.onSurface },
  styleTextActive: { color: colors.onBrandPrimary },

  preview: {
    marginTop: spacing.xl,
    aspectRatio: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceTertiary,
    overflow: "hidden",
    ...shadow.soft,
  },
  previewImg: { width: "100%", height: "100%" },
  previewCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  previewText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.muted },

  resultActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
  },
  secondaryText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.brand },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    ...shadow.card,
  },
  generateText: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.onBrandPrimary },
});
