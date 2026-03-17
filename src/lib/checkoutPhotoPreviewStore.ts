import { Capacitor } from "@capacitor/core";
import {
  Directory,
  Encoding,
  Filesystem,
  type WriteFileOptions,
} from "@capacitor/filesystem";

const PREVIEW_DIR = "checkout-photo-previews";

function safeKeySegment(input: string) {
  return input.replace(/[^a-zA-Z0-9-_]/g, "_");
}

function previewFilePath(storageKey: string, index: number) {
  return `${PREVIEW_DIR}/${safeKeySegment(storageKey)}_${index}.txt`;
}

export function canUseNativePreviewStore() {
  return Capacitor.isNativePlatform();
}

export async function saveCheckoutPhotoPreviews(params: {
  storageKey: string;
  previews: string[];
}): Promise<string[]> {
  const { storageKey, previews } = params;
  if (!canUseNativePreviewStore()) return [];

  const refs: string[] = [];

  for (let i = 0; i < previews.length; i++) {
    const path = previewFilePath(storageKey, i);
    const opts: WriteFileOptions = {
      path,
      directory: Directory.Data,
      data: previews[i],
      encoding: Encoding.UTF8,
      recursive: true,
    };
    await Filesystem.writeFile(opts);
    refs.push(path);
  }

  return refs;
}

export async function loadCheckoutPhotoPreviews(refs: string[]): Promise<string[]> {
  if (!canUseNativePreviewStore()) return [];

  const previews: string[] = [];
  for (const ref of refs) {
    const res = await Filesystem.readFile({
      path: ref,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    // Filesystem.readFile returns { data: string }
    previews.push(String(res.data ?? ""));
  }
  return previews.filter(Boolean);
}

export async function clearCheckoutPhotoPreviews(storageKey: string) {
  if (!canUseNativePreviewStore()) return;

  // Best-effort cleanup: we don't track exact count, so try first N.
  // (We keep this conservative to avoid listing directories, which is slower/less supported.)
  const MAX_TO_TRY = 12;
  await Promise.all(
    Array.from({ length: MAX_TO_TRY }).map(async (_, i) => {
      try {
        await Filesystem.deleteFile({
          path: previewFilePath(storageKey, i),
          directory: Directory.Data,
        });
      } catch {
        // ignore
      }
    }),
  );
}
