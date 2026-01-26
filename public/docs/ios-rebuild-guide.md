# WinterWatch Pro - iOS Rebuild Guide

**Version:** 1.0.0  
**Last Updated:** January 2025  
**App ID:** `app.lovable.1a2b04be8fe34bb1abd659ca66ba99f4`

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Build Process](#build-process)
4. [Troubleshooting](#troubleshooting)
5. [Performance Optimizations](#performance-optimizations)
6. [Native Configuration](#native-configuration)

---

## Prerequisites

### Required Software
- **macOS** (latest recommended)
- **Xcode 15+** (from Mac App Store)
- **Node.js 18+** and npm
- **Git**

### Required Accounts
- Apple Developer Account (for App Store distribution)
- OneSignal Account (for push notifications)
- Supabase Project Access

---

## Environment Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd winterwatch-pro

# Install dependencies
npm install
```

### 2. Verify Capacitor Installation

```bash
# Check Capacitor CLI
npx cap --version

# Should show version 8.x.x
```

### 3. Environment Variables

The Supabase credentials are hardcoded in `src/integrations/supabase/client.ts` for native platform reliability:

```typescript
const SUPABASE_URL = "https://caegybyfdkmgjrygnavg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIs...";
```

---

## Build Process

### Step 1: Build Web Assets

```bash
# Production build
npm run build
```

This creates optimized assets in the `dist/` folder.

### Step 2: Sync to iOS Platform

```bash
# Sync web assets and native dependencies
npx cap sync ios
```

### Step 3: Open in Xcode

```bash
# Open the iOS project
npx cap open ios
```

Or manually open: `ios/App/App.xcodeproj`

### Step 4: Configure Signing

1. In Xcode, select the **App** target
2. Go to **Signing & Capabilities**
3. Select your Development Team
4. Ensure Bundle Identifier matches: `app.lovable.1a2b04be8fe34bb1abd659ca66ba99f4`

### Step 5: Build and Run

1. Select target device (physical device or simulator)
2. Press **Cmd + R** or click the Play button
3. Wait for build to complete

---

## Troubleshooting

### Common Issues

#### 1. "Module not found" Errors

```bash
# Clean and rebuild
rm -rf ios/App/App/public
npm run build
npx cap sync ios
```

In Xcode:
- **Product → Clean Build Folder** (Cmd + Shift + K)

#### 2. Swift Package Manager Issues

```bash
# Reset SPM cache
rm -rf ~/Library/Caches/org.swift.swiftpm
rm -rf ios/App/CapApp-SPM/.build
```

In Xcode:
- **File → Packages → Reset Package Caches**

#### 3. OneSignal Plugin Not Found

Verify `OneSignalBridgePlugin.swift` is in **Build Phases → Compile Sources**

Check `BridgeViewController.swift` for proper plugin registration.

#### 4. Input Fields Unresponsive (iOS 18.2+)

The `BridgeViewController.swift` includes fixes for WebView touch handling:

```swift
private func optimizeScrollViewForTouchInput(_ scrollView: UIScrollView) {
    scrollView.delaysContentTouches = false
    scrollView.canCancelContentTouches = true
}
```

#### 5. Apple Sign-In Hangs

The app delays deep link auth initialization by 1000ms on iOS:

```typescript
// In App.tsx
if (Capacitor.getPlatform() === 'ios') {
  setTimeout(() => initDeepLinkAuth(), 1000);
}
```

#### 6. White Screen on Launch

Check `capacitor.config.ts` for proper server configuration:

```typescript
server: {
  url: "https://your-preview-url.lovable.app?forceHideBadge=true",
  cleartext: true
}
```

**For production builds:** Remove or comment out the `server` block.

---

## Performance Optimizations

### Implemented Optimizations

1. **Code Splitting**: All routes lazy-loaded with React.lazy()
2. **Query Caching**: 2-minute stale time, disabled refetch on focus for native
3. **Geolocation Caching**: 30-second cache to reduce GPS calls
4. **WebView Hardware Acceleration**: Enabled in BridgeViewController
5. **Manual Chunking**: Vendors split for better caching

### Bundle Analysis

```bash
# Analyze bundle size
npm run build -- --mode production
npx vite-bundle-visualizer
```

---

## Native Configuration

### capacitor.config.ts

```typescript
const config: CapacitorConfig = {
  appId: 'app.lovable.1a2b04be8fe34bb1abd659ca66ba99f4',
  appName: 'winterwatch',
  webDir: 'dist',
  // Development server (remove for production)
  server: {
    url: "https://your-url.lovableproject.com?forceHideBadge=true",
    cleartext: true
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scrollEnabled: true
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 0,
      backgroundColor: "#0f172a"
    }
  }
};
```

### Info.plist Keys

Required permission descriptions in `ios/App/App/Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>WinterWatch needs your location for check-in/check-out tracking</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>WinterWatch uses your location for geofence alerts</string>

<key>NSCameraUsageDescription</key>
<string>WinterWatch needs camera access for job photos</string>
```

---

## App Store Submission Checklist

### Before Submission

- [ ] Remove `server` block from `capacitor.config.ts`
- [ ] Verify all Info.plist privacy descriptions
- [ ] Test on physical device
- [ ] Verify push notifications work
- [ ] Check all deep links function
- [ ] Run performance audit

### Archive and Upload

1. **Product → Archive**
2. **Distribute App → App Store Connect**
3. Follow upload wizard

---

## Quick Reference Commands

```bash
# Full rebuild from scratch
npm run build && npx cap sync ios

# Open Xcode
npx cap open ios

# Update iOS dependencies only
npx cap update ios

# Run on connected device
npx cap run ios

# List connected devices
xcrun xctrace list devices
```

---

## Support Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [OneSignal iOS SDK](https://documentation.onesignal.com/docs/ios-sdk-setup)
- [Lovable Documentation](https://docs.lovable.dev)

---

*Generated for WinterWatch Pro iOS Application*
