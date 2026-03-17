import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

const APP_STORE_URL = "https://apps.apple.com/app/id<YOUR_APP_STORE_ID>";
const BUNDLE_ID = "com.winterwatch.pro";

function compareVersions(current: string, latest: string): boolean {
  const c = current.split(".").map(Number);
  const l = latest.split(".").map(Number);
  for (let i = 0; i < Math.max(c.length, l.length); i++) {
    const cv = c[i] ?? 0;
    const lv = l[i] ?? 0;
    if (lv > cv) return true;
    if (lv < cv) return false;
  }
  return false;
}

export function AppVersionCheck() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [latestVersion, setLatestVersion] = useState("");

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const checkVersion = async () => {
      try {
        const info = await App.getInfo();
        const currentVersion = info.version; // e.g. "1.2.0"

        const res = await fetch(
          `https://itunes.apple.com/lookup?bundleId=${BUNDLE_ID}&_t=${Date.now()}`
        );
        const data = await res.json();

        if (data.resultCount > 0) {
          const storeVersion = data.results[0].version as string;
          if (compareVersions(currentVersion, storeVersion)) {
            setLatestVersion(storeVersion);
            setShowPrompt(true);
          }
        }
      } catch (e) {
        console.warn("[VersionCheck] Failed:", e);
      }
    };

    // Small delay so the app UI loads first
    const timer = setTimeout(checkVersion, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleUpdate = () => {
    setShowPrompt(false);
    // Open App Store page
    window.open(APP_STORE_URL, "_system");
  };

  return (
    <AlertDialog open={showPrompt} onOpenChange={setShowPrompt}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update Available</AlertDialogTitle>
          <AlertDialogDescription>
            A new version ({latestVersion}) of WinterWatch Pro is available.
            Please update for the latest features and bug fixes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Later</AlertDialogCancel>
          <AlertDialogAction onClick={handleUpdate}>
            Update Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
