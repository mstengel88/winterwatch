# WinterWatch-Pro Native Home Screen Widgets

This folder contains native widget templates for iOS and Android. These require local development with Xcode/Android Studio.

## Prerequisites

- **iOS**: Mac with Xcode 15+ and iOS 17 SDK
- **Android**: Android Studio with SDK 26+
- Project exported to GitHub and synced with Capacitor

---

## iOS Widget Setup

### 1. Add Widget Extension in Xcode

1. Open your iOS project: `npx cap open ios`
2. In Xcode: File → New → Target → Widget Extension
3. Name it `WinterWatchWidget`
4. Uncheck "Include Configuration Intent"

### 2. Configure App Groups

1. Select your main app target → Signing & Capabilities
2. Add "App Groups" capability
3. Create group: `group.app.lovable.winterwatch`
4. Add the same App Group to your widget extension target

### 3. Add Widget Code

Copy `ios/WinterWatchWidget/WinterWatchWidget.swift` into your widget extension folder.

### 4. Update Data from App

Add this Capacitor plugin call to update widget data:

```swift
// In your iOS app code (e.g., AppDelegate or a Capacitor plugin)
import WidgetKit

func updateWidgetData(isActive: Bool, hoursWorked: Double, jobs: Int, temp: Int, conditions: String) {
    guard let defaults = UserDefaults(suiteName: "group.app.lovable.winterwatch") else { return }
    
    let status = ShiftStatus(
        isActive: isActive,
        startTime: isActive ? Date() : nil,
        hoursWorked: hoursWorked,
        jobsCompleted: jobs,
        temperature: temp,
        conditions: conditions
    )
    
    if let data = try? JSONEncoder().encode(status) {
        defaults.set(data, forKey: "shiftStatus")
    }
    
    WidgetCenter.shared.reloadTimelines(ofKind: "WinterWatchWidget")
}
```

---

## Android Widget Setup

### 1. Add Widget to Manifest

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<receiver
    android:name=".widget.WinterWatchWidget"
    android:exported="true">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/widget_winterwatch_info" />
</receiver>
```

### 2. Add Widget Info XML

Create `android/app/src/main/res/xml/widget_winterwatch_info.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="110dp"
    android:targetCellWidth="3"
    android:targetCellHeight="2"
    android:updatePeriodMillis="300000"
    android:initialLayout="@layout/widget_winterwatch"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:previewImage="@drawable/widget_preview" />
```

### 3. Add Drawable Resources

Create these files in `android/app/src/main/res/drawable/`:

**widget_background.xml:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android">
    <gradient
        android:startColor="#1976D2"
        android:endColor="#7C4DFF"
        android:angle="135" />
    <corners android:radius="16dp" />
</shape>
```

**widget_button_background.xml:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android">
    <solid android:color="#FFFFFF" />
    <corners android:radius="8dp" />
</shape>
```

**status_indicator.xml:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="oval">
    <solid android:color="#4CAF50" />
</shape>
```

### 4. Add Widget Files

- Copy `android/WinterWatchWidget.kt` to `android/app/src/main/java/app/lovable/winterwatch/widget/`
- Copy `android/res/layout/widget_winterwatch.xml` to `android/app/src/main/res/layout/`

### 5. Update Widget Data

Call from your Capacitor plugin or Activity:

```kotlin
WinterWatchWidget.updateWidgetData(
    context = this,
    isActive = true,
    shiftStartTime = System.currentTimeMillis(),
    jobsCompleted = 5,
    temperature = 28,
    conditions = "Light Snow"
)
```

---

## Capacitor Plugin (Optional)

For seamless integration, create a Capacitor plugin to bridge your web app with native widget updates:

```typescript
// In your web app
import { Capacitor, registerPlugin } from '@capacitor/core';

interface WidgetPlugin {
  updateShiftStatus(options: {
    isActive: boolean;
    hoursWorked: number;
    jobsCompleted: number;
    temperature: number;
    conditions: string;
  }): Promise<void>;
}

const Widget = registerPlugin<WidgetPlugin>('Widget');

// Call when shift status changes
await Widget.updateShiftStatus({
  isActive: true,
  hoursWorked: 2.5,
  jobsCompleted: 4,
  temperature: 28,
  conditions: 'Snow'
});
```

---

## Testing

### iOS
1. Build and run on device/simulator
2. Long-press home screen → Edit → Add Widget → WinterWatch

### Android
1. Build and install APK
2. Long-press home screen → Widgets → WinterWatch

---

## Troubleshooting

- **Widget not updating**: Check App Groups (iOS) or SharedPreferences (Android)
- **Widget not appearing**: Verify manifest entries and widget info XML
- **Data not syncing**: Ensure Capacitor plugin is calling native update methods
