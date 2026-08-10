import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

export type SaveResult = "saved" | "denied" | "blocked" | "error";

export async function base64ToTempFile(base64: string, ext = "png"): Promise<string> {
  const uri = `${FileSystem.cacheDirectory}instabloom-${Date.now()}.${ext}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: "base64" });
  return uri;
}

export async function saveToDevice(uri: string): Promise<SaveResult> {
  const perm = await MediaLibrary.requestPermissionsAsync();
  if (!perm.granted) {
    return perm.canAskAgain ? "denied" : "blocked";
  }
  try {
    await MediaLibrary.saveToLibraryAsync(uri);
    return "saved";
  } catch {
    return "error";
  }
}

export async function shareUri(uri: string): Promise<boolean> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { dialogTitle: "Share your bloom" });
    return true;
  }
  return false;
}

export async function uriToBase64(uri: string): Promise<string> {
  if (uri.startsWith("data:")) return uri.split(",")[1];
  if (uri.startsWith("http")) {
    const dest = `${FileSystem.cacheDirectory}dl-${Date.now()}`;
    const r = await FileSystem.downloadAsync(uri, dest);
    return FileSystem.readAsStringAsync(r.uri, { encoding: "base64" });
  }
  return FileSystem.readAsStringAsync(uri, { encoding: "base64" });
}
