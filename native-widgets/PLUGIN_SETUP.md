# Capacitor Widget Plugin Setup Guide

This guide walks you through integrating the WinterWatch widget sync plugin with your native iOS and Android apps.

---

## Prerequisites

- Project exported to GitHub
- Capacitor configured and synced
- Xcode 15+ (for iOS)
- Android Studio (for Android)

---

## iOS Setup

### 1. Add the Plugin File

Copy `ios/WidgetPlugin.swift` to your iOS project:

```bash
cp native-widgets/ios/WidgetPlugin.swift ios/App/App/Plugins/
```

### 2. Register the Plugin

In `ios/App/App/AppDelegate.swift`, add the plugin import and registration:

```swift
import Capacitor

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }

    func application(_ application: UIApplication, didDiscardSceneSessions sceneSessions: Set<UISceneSession>) {
        // Called when the user discards a scene session.
        // If any sessions were discarded while the application was not running, this will be called shortly after application:didFinishLaunchingWithOptions.
        // Use this method to release any resources that were specific to the discarded scenes, as they will not return.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to register additional URL handling logic here.
        return self.bridge?.application(app, open: url, options: options) ?? false
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was ইউনিভারsal link is opened. Feel free to add additional user activity handling logic here.
        return self.bridge?.application(application, continue: userActivity, restorationHandler: restorationHandler) ?? false
    }
}
```

Capacitor 4+ auto-registers plugins, but if using older versions, add to `application(_:didFinishLaunchingWithOptions:)`:

```swift
let bridge = self.bridge
bridge?.registerPluginInstance(WidgetPlugin())
```

### 3. Configure App Groups

1. Open Xcode project: `npx cap open ios`
2. Select App target → Signing & Capabilities
3. Click "+ Capability" → App Groups
4. Add group: `group.app.lovable.winterwatch`
5. Repeat for your Widget Extension target

### 4. Configure URL Scheme

In `ios/App/App/Info.plist`, add:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>winterwatch</string>
        </array>
        <key>CFBundleURLName</key>
        <string>app.lovable.winterwatch</string>
    </dict>
</array>
```

---

## Android Setup

### 1. Add the Plugin File

Copy the plugin to your Android project:

```bash
mkdir -p android/app/src/main/java/app/lovable/winterwatch/plugins
cp native-widgets/android/WidgetPlugin.kt android/app/src/main/java/app/lovable/winterwatch/plugins/
```

### 2. Register the Plugin

In `android/app/src/main/java/.../MainActivity.kt`:

```kotlin
import app.lovable.winterwatch.plugins.WidgetPlugin

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(WidgetPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
```

### 3. Add Intent Filters

In `android/app/src/main/AndroidManifest.xml`, add to the main activity:

```xml
<activity
    android:name=".MainActivity"
    android:launchMode="singleTask">
    
    <!-- Existing intent filters... -->
    
    <!-- Widget action intents -->
    <intent-filter>
        <action android:name="CLOCK_IN" />
        <action android:name="CLOCK_OUT" />
        <action android:name="OPEN_DASHBOARD" />
        <category android:name="android.intent.category.DEFAULT" />
    </intent-filter>
</activity>
```

---

## Web App Integration

### 1. Use the Hook in Dashboards

In `DriverDashboard.tsx` and `ShovelDashboard.tsx`, add the widget sync hook:

```typescript
import { useWidgetSync } from '@/hooks/useWidgetSync';

export default function DriverDashboard() {
  // ... existing code ...
  
  // Add widget sync
  useWidgetSync({
    temperature,
    conditions: weather,
    jobsCompleted: todayStats.total,
    isCheckedIn: !!activeWorkLog,
    currentLocation: selectedAccountId 
      ? accounts.find(a => a.id === selectedAccountId)?.name 
      : undefined,
  });
  
  // ... rest of component
}
```

### 2. Handle Widget Actions

Listen for widget tap events in your root component or context:

```typescript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleClockIn = () => {
      navigate('/time-clock');
      // Trigger clock in action
    };

    const handleDashboard = () => {
      navigate('/dashboard');
    };

    window.addEventListener('widget:clockIn', handleClockIn);
    window.addEventListener('widget:openDashboard', handleDashboard);

    return () => {
      window.removeEventListener('widget:clockIn', handleClockIn);
      window.removeEventListener('widget:openDashboard', handleDashboard);
    };
  }, [navigate]);

  return <RouterProvider ... />;
}
```

---

## Testing

### iOS Simulator/Device

1. Build and run: `npx cap run ios`
2. Add widget to home screen
3. Verify data updates when you clock in/out

### Android Emulator/Device

1. Build and run: `npx cap run android`
2. Long-press home screen → Widgets → WinterWatch
3. Test clock in/out from app and verify widget updates

### Debug Logging

Check native logs for plugin activity:

**iOS (Xcode Console):**
```
[WidgetPlugin] Updated shift status: Active
```

**Android (Logcat):**
```
D/WidgetPlugin: Updated shift data, refreshing widgets
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Widget not updating | Check App Groups (iOS) or SharedPreferences access (Android) |
| Plugin not found | Verify registration in AppDelegate/MainActivity |
| URL scheme not working | Check Info.plist (iOS) or AndroidManifest.xml |
| Data not persisting | Verify group identifier matches in plugin and widget |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Web App (React)                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │              useWidgetSync Hook                  │   │
│  │  - Monitors shift/work status                    │   │
│  │  - Auto-updates on changes                       │   │
│  │  - Handles widget action events                  │   │
│  └───────────────────────┬─────────────────────────┘   │
└──────────────────────────┼──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  Capacitor Bridge                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │              widgetService                       │   │
│  │  - updateShiftStatus(data)                       │   │
│  │  - onWidgetAction(callback)                      │   │
│  └───────────────────────┬─────────────────────────┘   │
└──────────────────────────┼──────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
┌─────────────────────┐         ┌─────────────────────┐
│    iOS Plugin       │         │   Android Plugin    │
│  ┌──────────────┐   │         │  ┌──────────────┐   │
│  │ UserDefaults │   │         │  │SharedPrefs   │   │
│  │ (App Groups) │   │         │  │              │   │
│  └──────┬───────┘   │         │  └──────┬───────┘   │
│         │           │         │         │           │
│         ▼           │         │         ▼           │
│  ┌──────────────┐   │         │  ┌──────────────┐   │
│  │ WidgetKit    │   │         │  │AppWidgetMgr  │   │
│  │ Timeline     │   │         │  │ Broadcast    │   │
│  └──────────────┘   │         │  └──────────────┘   │
└─────────────────────┘         └─────────────────────┘
           │                               │
           ▼                               ▼
    ┌─────────────┐                 ┌─────────────┐
    │ iOS Widget  │                 │Android Widgt│
    │ (Home/Lock) │                 │ (Home)      │
    └─────────────┘                 └─────────────┘
```
