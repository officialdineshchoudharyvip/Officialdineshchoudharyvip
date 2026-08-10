import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  Flower,
  DownloadSimple,
  ShareNetwork,
  Trash,
  PencilSimple,
  X,
} from "phosphor-react-native";

import { api, Creation } from "@/src/api";
import { setEditorSeed } from "@/src/editorStore";
import { base64ToTempFile, saveToDevice, shareUri } from "@/src/media";
import { useToast } from "@/src/components/Toast";
import { colors, fonts, radius, shadow, spacing } from "@/src/theme";

const { width } = Dimensions.get("window");
const GRID_W = (width - spacing.lg * 2 - spacing.md) / 2;

type Tab = "edited" | "ai";

export default function Gallery() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("ai");
  const [items, setItems] = useState<Creation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Creation | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listCreations(tab);
      setItems(data);
    } catch {
      toast.show("Could not load gallery", "error");
    } finally {
      setLoading(false);
    }
  }, [tab, toast]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const doSave = async (c: Creation) => {
    const uri = await base64ToTempFile(c.image_base64);
    const r = await saveToDevice(uri);
    if (r === "saved") toast.show("Saved to your photos", "success");
    else if (r === "blocked") {
      toast.show("Enable photo access in Settings", "error");
      Linking.openSettings();
    } else if (r === "denied") toast.show("Photo permission needed", "error");
    else toast.show("Could not save", "error");
  };

  const doShare = async (c: Creation) => {
    const uri = await base64ToTempFile(c.image_base64);
    await shareUri(uri);
  };

  const doDelete = async (c: Creation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await api.deleteCreation(c.id);
      setItems((prev) => prev.filter((x) => x.id !== c.id));
      setSelected(null);
      toast.show("Deleted", "success");
    } catch {
      toast.show("Could not delete", "error");
    }
  };

  const doEdit = (c: Creation) => {
    setSelected(null);
    setEditorSeed({ base64: c.image_base64 });
    router.push("/editor");
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>My Garden</Text>
        <View style={styles.segment}>
          {(["ai", "edited"] as Tab[]).map((t) => (
            <Pressable
              key={t}
              testID={`gallery-tab-${t}`}
              onPress={() => {
                Haptics.selectionAsync();
                setTab(t);
              }}
              style={[styles.segmentBtn, tab === t && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, tab === t && styles.segmentTextActive]}>
                {t === "ai" ? "AI Generated" : "Edited"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Flower size={64} color={colors.brandSecondary} weight="duotone" />
          <Text style={styles.emptyTitle}>Your garden is empty</Text>
          <Text style={styles.emptySub}>Start creating to fill it with blooms</Text>
          <Pressable
            testID="gallery-empty-cta"
            style={styles.cta}
            onPress={() => router.push(tab === "ai" ? "/generate" : "/editor")}
          >
            <Text style={styles.ctaText}>{tab === "ai" ? "Create with AI" : "Open Studio"}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            {items.map((c) => (
              <Pressable
                key={c.id}
                testID={`gallery-item-${c.id}`}
                style={styles.gridCard}
                onPress={() => setSelected(c)}
              >
                <Image
                  source={{ uri: `data:image/png;base64,${c.image_base64}` }}
                  style={styles.gridImg}
                  contentFit="cover"
                  transition={150}
                />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBg}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Pressable style={styles.modalClose} onPress={() => setSelected(null)} testID="preview-close">
              <X size={22} color={colors.onSurface} weight="bold" />
            </Pressable>
            {selected && (
              <>
                <Image
                  source={{ uri: `data:image/png;base64,${selected.image_base64}` }}
                  style={styles.modalImg}
                  contentFit="contain"
                />
                <View style={styles.modalActions}>
                  <ActionBtn icon={<DownloadSimple size={22} color={colors.brand} weight="bold" />} label="Save" onPress={() => doSave(selected)} testID="preview-save" />
                  <ActionBtn icon={<ShareNetwork size={22} color={colors.brand} weight="bold" />} label="Share" onPress={() => doShare(selected)} testID="preview-share" />
                  <ActionBtn icon={<PencilSimple size={22} color={colors.brand} weight="bold" />} label="Edit" onPress={() => doEdit(selected)} testID="preview-edit" />
                  <ActionBtn icon={<Trash size={22} color={colors.error} weight="bold" />} label="Delete" onPress={() => doDelete(selected)} testID="preview-delete" />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ActionBtn({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable style={styles.actionBtn} onPress={onPress} testID={testID}>
      {icon}
      <Text style={[styles.actionLabel, label === "Delete" && { color: colors.error }]}>{label}</Text>
    </Pressable>
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
  title: { fontFamily: fonts.display, fontSize: 26, color: colors.onSurface, marginBottom: spacing.md },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.pill,
    padding: 4,
  },
  segmentBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.pill, alignItems: "center" },
  segmentActive: { backgroundColor: colors.surfaceSecondary, ...shadow.soft },
  segmentText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.muted },
  segmentTextActive: { color: colors.brand },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.xl },
  emptyTitle: { fontFamily: fonts.displaySemi, fontSize: 18, color: colors.onSurface, marginTop: spacing.sm },
  emptySub: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  cta: {
    marginTop: spacing.lg,
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  ctaText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onBrandPrimary },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  gridCard: {
    width: GRID_W,
    height: GRID_W,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceTertiary,
    ...shadow.soft,
  },
  gridImg: { width: "100%", height: "100%" },

  modalBg: { flex: 1, backgroundColor: "rgba(31,26,28,0.6)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
  },
  modalClose: { alignSelf: "flex-end", padding: spacing.xs },
  modalImg: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
  },
  modalActions: { flexDirection: "row", justifyContent: "space-around", marginTop: spacing.lg },
  actionBtn: { alignItems: "center", gap: spacing.xs, padding: spacing.sm },
  actionLabel: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.brand },
});
