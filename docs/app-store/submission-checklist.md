# WinterWatch-Pro App Store Submission Checklist

Last updated: July 30, 2026

## Before Archive

- Confirm Xcode is opening [ios/App/WinterWatch-Pro.xcodeproj](/Users/mattstengel/winterwatch/ios/App/WinterWatch-Pro.xcodeproj).
- Confirm app version is `4.2` and increment the build number for each upload.
- Run a fresh Capacitor web sync before archive so the native bundle matches production UI.
- Test login, shift start, shift end, push permission, and a work-log photo upload on a real iPhone.
- Verify `winterwatch-pro.info` opens the app flow and `winterwatch-pro.store` opens the marketing site.

## App Store Connect Metadata

- App Name: `WinterWatch-Pro`
- Subtitle suggestion: `Snow Operations and Crew Tracking`
- Category: `Business`
- Secondary Category: `Productivity`
- Content Rights: `You own or control all rights`
- Age Rating: `4+` unless App Store Connect flags a higher rating due to user-generated content or location

## Upload Package Checks

- Privacy policy URL points to the live policy page.
- Support URL points to your customer support/contact page.
- Export compliance stays `No` because `ITSAppUsesNonExemptEncryption` is already `false`.
- Sign in with Apple remains required only if third-party login is still enabled for end users in production.

## Review Readiness

- Demo account or review account is ready.
- App Review notes are copied from [review-notes.md](/Users/mattstengel/winterwatch/docs/app-store/review-notes.md).
- Screenshots are current for iPhone sizes used in App Store Connect.
- Push notifications are explained in review notes.
- Background location use is explained clearly in review notes.

## After Upload

- Wait for processing to finish in App Store Connect.
- Fill in App Privacy answers using [app-privacy-matrix.md](/Users/mattstengel/winterwatch/docs/app-store/app-privacy-matrix.md).
- Attach release notes from [release-notes-4.2.md](/Users/mattstengel/winterwatch/docs/app-store/release-notes-4.2.md).
- Submit for review only after confirming the processed build launches the current app shell, not the marketing landing page.
