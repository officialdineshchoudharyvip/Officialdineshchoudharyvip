import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Linking,
  Modal,
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
import { captureRef } from "react-native-view-shot";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import {
  X,
  ShareNetwork,
  DownloadSimple,
  ImageSquare,
  FrameCorners,
  TextT,
  Sliders,
  MagicWand,
  Trash,
  Camera,
  Flower,
  FlowerLotus,
  FlowerTulip,
  Butterfly,
  Leaf,
  Heart,
  Sparkle,
  Sun,
} from "phosphor-react-native";

import { api } from "@/src/api";
import { takeEditorSeed } from "@/src/editorStore";
import { saveToDevice, shareUri, uriToBase64 } from "@/src/media";
import { DraggableItem } from "@/src/components/DraggableItem";
import { useToast } from "@/src/components/Toast";
import { colors, fonts, radius, shadow, spacing } from "@/src/theme";

const { width } = Dimensions.get("window");
const CANVAS = width - spacing.lg * 2;

type Base = { uri?: string; base64?: string } | null;
type Panel = "frames" | "stickers" | "filters" | null;

const FILTERS = [
  { key: "none", label: "None", color: "transparent" },
  { key: "warm", label: "Warm", color: "rgba(255,170,110,0.22)" },
  { key: "blush", label: "Blush", color: "rgba(240,90,126,0.20)" },
  { key: "vintage", label: "Vintage", color: "rgba(120,80,40,0.30)" },
  { key: "soft", label: "Soft", color: "rgba(255,255,255,0.16)" },
];

const FRAMES = [
  { key: "none", label: "None", w: 0, c: "transparent" },
  { key: "blush", label: "Blush", w: 12, c: colors.brandSecondary },
  { key: "rose", label: "Rose", w: 14, c: colors.brand },
  { key: "gold", label: "Gold", w: 10, c: colors.gold },
  { key: "cream", label: "Cream", w: 16, c: "#FFF3EE" },
];

const STICKERS: { key: string; Comp: any; color: string }[] = [
  { key: "flower", Comp: Flower, color: colors.brand },
  { key: "lotus", Comp: FlowerLotus, color: "#E76BA0" },
  { key: "tulip", Comp: FlowerTulip, color: colors.brandSecondary },
  { key: "butterfly", Comp: Butterfly, color: colors.gold },
  { key: "leaf", Comp: Leaf, color: colors.success },
  { key: "heart", Comp: Heart, color: colors.brand },
  { key: "sparkle", Comp: Sparkle, color: colors.gold },
  { key: "sun", Comp: Sun, color: "#F5A623" },
];

const TEXT_COLORS = ["#FFFFFF", colors.brand, colors.gold, colors.onSurface, colors.success];
const CAPTION_PRESETS = [
  "Bloom where you're planted 🌷",
  "Follow for daily florals 🌸",
  "Petals & positivity",
  "#flowerlove #bloom #instagood",
];

const AI_SUGGESTIONS = [
  "Add a soft pink rose background",
  "Surround with blooming cherry blossoms",
  "Replace background with a flower field",
  "Add floating flower petals",
];

let idCounter = 0;
const nextId = () => `item-${idCounter++}`;

type StickerItem = { id: string; kind: "sticker"; typeKey: string };
type TextItem = { id: string; kind: "text"; text: string; color: string };
type Item = StickerItem | TextItem;

export default function Editor() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const canvasRef = useRef<View>(null);

  const [base, setBase] = useState<Base>(null);
  const [baseBase64, setBaseBase64] = useState<string | null>(null);
  const [filter, setFilter] = useState(0);
  const [frame, setFrame] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState(false);

  const [textModal, setTextModal] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [textColor, setTextColor] = useState(TEXT_COLORS[0]);

  const [aiModal, setAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const seed = takeEditorSeed();
    if (seed) {
      setBase(seed);
      if (seed.base64) setBaseBase64(seed.base64);
    }
  }, []);

  const baseUri = useMemo(() => {
    if (!base) return null;
    if (base.base64) return `data:image/png;base64,${base.base64}`;
    return base.uri ?? null;
  }, [base]);

  const ensureBaseBase64 = async (): Promise<string | null> => {
    if (baseBase64) return baseBase64;
    if (base?.base64) {
      setBaseBase64(base.base64);
      return base.base64;
    }
    if (base?.uri) {
      const b = await uriToBase64(base.uri);
      setBaseBase64(b);
      return b;
    }
    return null;
  };

  const pickFrom = async (source: "camera" | "library") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const perm =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      if (!perm.canAskAgain) {
        toast.show("Enable access in Settings", "error");
        Linking.openSettings();
      } else {
        toast.show("Permission needed to continue", "error");
      }
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = {
      quality: 0.9,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    };
    const res =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync({ ...opts, mediaTypes: ["images"] });
    if (res.canceled) return;
    const asset = res.assets[0];
    setBase({ uri: asset.uri, base64: asset.base64 ?? undefined });
    setBaseBase64(asset.base64 ?? null);
  };

  const addSticker = (typeKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const item: StickerItem = { id: nextId(), kind: "sticker", typeKey };
    setItems((prev) => [...prev, item]);
    setSelectedId(item.id);
  };

  const addText = () => {
    if (!textInput.trim()) {
      setTextModal(false);
      return;
    }
    const item: TextItem = { id: nextId(), kind: "text", text: textInput.trim(), color: textColor };
    setItems((prev) => [...prev, item]);
    setSelectedId(item.id);
    setTextInput("");
    setTextModal(false);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setItems((prev) => prev.filter((i) => i.id !== selectedId));
    setSelectedId(null);
  };

  const runAiEdit = async () => {
    if (!aiPrompt.trim()) {
      toast.show("Describe your edit first", "info");
      return;
    }
    setAiLoading(true);
    try {
      const b64 = await ensureBaseBase64();
      if (!b64) {
        toast.show("Select a photo first", "error");
        return;
      }
      const res = await api.edit(b64, aiPrompt.trim());
      setBase({ base64: res.image_base64 });
      setBaseBase64(res.image_base64);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAiModal(false);
      setAiPrompt("");
      toast.show("AI magic applied", "success");
    } catch (e: any) {
      toast.show(e?.message || "AI edit failed", "error");
    } finally {
      setAiLoading(false);
    }
  };

  const captureToFile = async (): Promise<string> => {
    setSelectedId(null);
    setPanel(null);
    await new Promise((r) => setTimeout(r, 120));
    return captureRef(canvasRef, { format: "png", quality: 0.95, result: "tmpfile" });
  };

  const handleSave = async () => {
    if (!baseUri) return;
    setBusy(true);
    try {
      const uri = await captureToFile();
      const b64 = await uriToBase64(uri);
      await api.saveCreation("edited", b64);
      const r = await saveToDevice(uri);
      if (r === "saved") toast.show("Saved to your photos & gallery", "success");
      else if (r === "blocked") {
        toast.show("Enable photo access in Settings", "error");
        Linking.openSettings();
      } else if (r === "denied") toast.show("Saved to gallery. Allow photos to save on device", "info");
      else toast.show("Saved to gallery", "success");
    } catch {
      toast.show("Could not save", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    if (!baseUri) return;
    setBusy(true);
    try {
      const uri = await captureToFile();
      const b64 = await uriToBase64(uri);
      await api.saveCreation("edited", b64);
      await shareUri(uri);
    } catch {
      toast.show("Could not share", "error");
    } finally {
      setBusy(false);
    }
  };

  const center = CANVAS / 2;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.headerBtn} onPress={() => router.back()} testID="editor-cancel">
          <X size={22} color={colors.onSurface} weight="bold" />
        </Pressable>
        <Text style={styles.headerTitle}>Studio</Text>
        <View style={styles.headerRight}>
          {selectedId && (
            <Pressable style={styles.headerBtn} onPress={deleteSelected} testID="editor-delete-selected">
              <Trash size={20} color={colors.error} weight="bold" />
            </Pressable>
          )}
        </View>
      </View>

      {!baseUri ? (
        <View style={styles.emptyWrap}>
          <Flower size={72} color={colors.brandSecondary} weight="duotone" />
          <Text style={styles.emptyTitle}>Pick a photo to begin</Text>
          <Text style={styles.emptySub}>Add flowers, frames, text & more</Text>
          <View style={styles.emptyBtns}>
            <Pressable style={styles.pickBtn} onPress={() => pickFrom("camera")} testID="editor-open-camera">
              <Camera size={24} color={colors.onBrandPrimary} weight="fill" />
              <Text style={styles.pickText}>Camera</Text>
            </Pressable>
            <Pressable style={[styles.pickBtn, styles.pickBtnAlt]} onPress={() => pickFrom("library")} testID="editor-open-gallery">
              <ImageSquare size={24} color={colors.brand} weight="fill" />
              <Text style={[styles.pickText, { color: colors.brand }]}>Gallery</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.canvasWrap}>
            <View
              ref={canvasRef}
              collapsable={false}
              style={styles.canvas}
              testID="editor-canvas"
            >
              <Image source={{ uri: baseUri }} style={styles.canvasImg} contentFit="cover" />
              {FILTERS[filter].color !== "transparent" && (
                <View
                  pointerEvents="none"
                  style={[StyleSheet.absoluteFill, { backgroundColor: FILTERS[filter].color }]}
                />
              )}
              {/* tap to deselect */}
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedId(null)} />
              {items.map((item) => {
                if (item.kind === "sticker") {
                  const def = STICKERS.find((s) => s.key === item.typeKey)!;
                  const Comp = def.Comp;
                  return (
                    <DraggableItem
                      key={item.id}
                      initialX={center - 45}
                      initialY={center - 45}
                      selected={selectedId === item.id}
                      onSelect={() => setSelectedId(item.id)}
                    >
                      <Comp size={80} color={def.color} weight="fill" />
                    </DraggableItem>
                  );
                }
                return (
                  <DraggableItem
                    key={item.id}
                    initialX={center - 70}
                    initialY={center - 20}
                    selected={selectedId === item.id}
                    onSelect={() => setSelectedId(item.id)}
                  >
                    <Text style={[styles.overlayText, { color: item.color }]}>{item.text}</Text>
                  </DraggableItem>
                );
              })}
              {FRAMES[frame].w > 0 && (
                <View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    { borderWidth: FRAMES[frame].w, borderColor: FRAMES[frame].c },
                  ]}
                />
              )}
            </View>
          </View>

          {/* Header actions for save/share */}
          <View style={[styles.actionBar, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
            <View style={styles.actionBarInner} pointerEvents="box-none">
              <Pressable style={styles.topAction} onPress={handleShare} disabled={busy} testID="editor-share">
                <ShareNetwork size={18} color={colors.brand} weight="bold" />
              </Pressable>
              <Pressable style={[styles.topAction, styles.topActionPrimary]} onPress={handleSave} disabled={busy} testID="editor-save">
                {busy ? (
                  <ActivityIndicator color={colors.onBrandPrimary} size="small" />
                ) : (
                  <>
                    <DownloadSimple size={18} color={colors.onBrandPrimary} weight="bold" />
                    <Text style={styles.topActionText}>Save</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>

          {/* Contextual panels */}
          {panel === "filters" && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
              {FILTERS.map((f, i) => (
                <Pressable
                  key={f.key}
                  testID={`filter-${f.key}`}
                  onPress={() => setFilter(i)}
                  style={[styles.optionChip, filter === i && styles.optionChipActive]}
                >
                  <Text style={[styles.optionText, filter === i && styles.optionTextActive]}>{f.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          {panel === "frames" && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
              {FRAMES.map((f, i) => (
                <Pressable
                  key={f.key}
                  testID={`frame-${f.key}`}
                  onPress={() => setFrame(i)}
                  style={[styles.optionChip, frame === i && styles.optionChipActive]}
                >
                  <Text style={[styles.optionText, frame === i && styles.optionTextActive]}>{f.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          {panel === "stickers" && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
              {STICKERS.map((s) => {
                const Comp = s.Comp;
                return (
                  <Pressable
                    key={s.key}
                    testID={`sticker-${s.key}`}
                    onPress={() => addSticker(s.key)}
                    style={styles.stickerChip}
                  >
                    <Comp size={30} color={s.color} weight="fill" />
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Tool rail */}
          <View style={[styles.toolRail, { paddingBottom: insets.bottom + spacing.sm }]}>
            <Tool icon={<ImageSquare size={24} color={colors.onSurface} />} label="Photo" onPress={() => pickFrom("library")} testID="tool-photo" />
            <Tool icon={<Sliders size={24} color={panel === "filters" ? colors.brand : colors.onSurface} />} label="Filter" active={panel === "filters"} onPress={() => setPanel(panel === "filters" ? null : "filters")} testID="tool-filter" />
            <Tool icon={<FrameCorners size={24} color={panel === "frames" ? colors.brand : colors.onSurface} />} label="Frame" active={panel === "frames"} onPress={() => setPanel(panel === "frames" ? null : "frames")} testID="tool-frame" />
            <Tool icon={<Flower size={24} color={panel === "stickers" ? colors.brand : colors.onSurface} weight={panel === "stickers" ? "fill" : "regular"} />} label="Sticker" active={panel === "stickers"} onPress={() => setPanel(panel === "stickers" ? null : "stickers")} testID="tool-sticker" />
            <Tool icon={<TextT size={24} color={colors.onSurface} />} label="Text" onPress={() => { setPanel(null); setTextModal(true); }} testID="tool-text" />
            <Tool icon={<MagicWand size={24} color={colors.brand} weight="fill" />} label="AI" onPress={() => { setPanel(null); setAiModal(true); }} testID="tool-ai" />
          </View>
        </>
      )}

      {/* Text modal */}
      <Modal visible={textModal} transparent animationType="slide" onRequestClose={() => setTextModal(false)}>
        <KeyboardAvoidingView style={styles.modalBg} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTextModal(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Text style={styles.sheetTitle}>Add caption</Text>
            <TextInput
              testID="text-input"
              value={textInput}
              onChangeText={setTextInput}
              placeholder="Type your caption"
              placeholderTextColor={colors.muted}
              style={styles.sheetInput}
              multiline
            />
            <View style={styles.swatchRow}>
              {TEXT_COLORS.map((c) => (
                <Pressable
                  key={c}
                  testID={`text-color-${c}`}
                  onPress={() => setTextColor(c)}
                  style={[styles.swatch, { backgroundColor: c }, textColor === c && styles.swatchActive]}
                />
              ))}
            </View>
            <Text style={styles.presetLabel}>Quick captions</Text>
            <View style={{ gap: spacing.sm }}>
              {CAPTION_PRESETS.map((p) => (
                <Pressable key={p} style={styles.presetChip} onPress={() => setTextInput(p)}>
                  <Text style={styles.presetText}>{p}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.sheetCta} onPress={addText} testID="text-add-button">
              <Text style={styles.sheetCtaText}>Add to photo</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* AI modal */}
      <Modal visible={aiModal} transparent animationType="slide" onRequestClose={() => !aiLoading && setAiModal(false)}>
        <KeyboardAvoidingView style={styles.modalBg} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !aiLoading && setAiModal(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.aiHead}>
              <MagicWand size={22} color={colors.brand} weight="fill" />
              <Text style={styles.sheetTitle}>AI photo magic</Text>
            </View>
            <Text style={styles.sheetSub}>Describe how to transform your photo</Text>
            <TextInput
              testID="ai-prompt-input"
              value={aiPrompt}
              onChangeText={setAiPrompt}
              placeholder="e.g. Add a soft pink rose background"
              placeholderTextColor={colors.muted}
              style={styles.sheetInput}
              multiline
              editable={!aiLoading}
            />
            <View style={styles.aiSuggestWrap}>
              {AI_SUGGESTIONS.map((s) => (
                <Pressable key={s} style={styles.presetChip} onPress={() => setAiPrompt(s)} disabled={aiLoading}>
                  <Sparkle size={13} color={colors.brand} weight="fill" />
                  <Text style={styles.presetText}>{s}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[styles.sheetCta, aiLoading && { opacity: 0.7 }]}
              onPress={runAiEdit}
              disabled={aiLoading}
              testID="ai-apply-button"
            >
              {aiLoading ? (
                <>
                  <ActivityIndicator color={colors.onBrandPrimary} size="small" />
                  <Text style={styles.sheetCtaText}>Planting seeds...</Text>
                </>
              ) : (
                <Text style={styles.sheetCtaText}>Apply AI magic</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Tool({
  icon,
  label,
  onPress,
  active,
  testID,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  active?: boolean;
  testID: string;
}) {
  return (
    <Pressable style={styles.tool} onPress={onPress} testID={testID}>
      {icon}
      <Text style={[styles.toolLabel, active && { color: colors.brand }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
  headerTitle: { fontFamily: fonts.displaySemi, fontSize: 18, color: colors.onSurface },
  headerRight: { width: 40, alignItems: "flex-end" },

  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.xl },
  emptyTitle: { fontFamily: fonts.displaySemi, fontSize: 20, color: colors.onSurface, marginTop: spacing.md },
  emptySub: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  emptyBtns: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl },
  pickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    ...shadow.card,
  },
  pickBtnAlt: { backgroundColor: colors.surfaceSecondary, borderWidth: 1.5, borderColor: colors.brand },
  pickText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onBrandPrimary },

  canvasWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  canvas: {
    width: CANVAS,
    height: CANVAS,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceTertiary,
  },
  canvasImg: { width: "100%", height: "100%" },
  overlayText: { fontFamily: fonts.bodyBold, fontSize: 26, textShadowColor: "rgba(0,0,0,0.35)", textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },

  actionBar: { position: "absolute", right: spacing.lg, left: spacing.lg },
  actionBarInner: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm },
  topAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    ...shadow.soft,
  },
  topActionPrimary: { backgroundColor: colors.brand },
  topActionText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.onBrandPrimary },

  optionRow: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, alignItems: "center" },
  optionChip: {
    height: 40,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  optionChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  optionText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.onSurface },
  optionTextActive: { color: colors.onBrandPrimary },
  stickerChip: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  toolRail: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  tool: { alignItems: "center", gap: spacing.xs, minWidth: 48 },
  toolLabel: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.muted },

  modalBg: { flex: 1, backgroundColor: "rgba(31,26,28,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  aiHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sheetTitle: { fontFamily: fonts.displaySemi, fontSize: 18, color: colors.onSurface },
  sheetSub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: -spacing.sm },
  sheetInput: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 70,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.onSurfaceTertiary,
    textAlignVertical: "top",
  },
  swatchRow: { flexDirection: "row", gap: spacing.md },
  swatch: { width: 34, height: 34, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  swatchActive: { borderWidth: 3, borderColor: colors.brand },
  presetLabel: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.muted },
  presetChip: {
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
  presetText: { fontFamily: fonts.body, fontSize: 14, color: colors.onSurface, flex: 1 },
  aiSuggestWrap: { gap: spacing.sm },
  sheetCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
    ...shadow.card,
  },
  sheetCtaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.onBrandPrimary },
});
