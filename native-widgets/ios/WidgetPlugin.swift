/**
 * WinterWatch Widget Capacitor Plugin - iOS Implementation
 * Syncs shift data between the web app and iOS home screen widgets
 *
 * Add to your iOS project:
 * 1. Copy this file to ios/App/App/Plugins/WidgetPlugin.swift
 * 2. Register in AppDelegate.swift or via Capacitor's plugin registration
 */

import Foundation
import Capacitor
import WidgetKit

@objc(WidgetPlugin)
public class WidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetPlugin"
    public let jsName = "Widget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "updateShiftStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getWidgetData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "refreshWidgets", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise)
    ]
    
    private let appGroupIdentifier = "group.app.lovable.winterwatch"
    private let dataKey = "shiftStatus"
    
    // MARK: - Plugin Methods
    
    @objc func updateShiftStatus(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: appGroupIdentifier) else {
            call.reject("Failed to access App Group")
            return
        }
        
        let data: [String: Any] = [
            "isActive": call.getBool("isActive") ?? false,
            "shiftStartTime": call.getString("shiftStartTime") ?? "",
            "hoursWorked": call.getDouble("hoursWorked") ?? 0.0,
            "jobsCompleted": call.getInt("jobsCompleted") ?? 0,
            "temperature": call.getInt("temperature") ?? 32,
            "conditions": call.getString("conditions") ?? "Unknown",
            "isCheckedIn": call.getBool("isCheckedIn") ?? false,
            "currentLocation": call.getString("currentLocation") ?? "",
            "employeeName": call.getString("employeeName") ?? "",
            "updatedAt": ISO8601DateFormatter().string(from: Date())
        ]
        
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: data)
            defaults.set(jsonData, forKey: dataKey)
            defaults.synchronize()
            
            // Trigger widget refresh
            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadTimelines(ofKind: "WinterWatchWidget")
            }
            
            call.resolve()
        } catch {
            call.reject("Failed to serialize data: \(error.localizedDescription)")
        }
    }
    
    @objc func getWidgetData(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: appGroupIdentifier),
              let jsonData = defaults.data(forKey: dataKey) else {
            call.resolve([:])
            return
        }
        
        do {
            if let data = try JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
                call.resolve(data)
            } else {
                call.resolve([:])
            }
        } catch {
            call.reject("Failed to deserialize data: \(error.localizedDescription)")
        }
    }
    
    @objc func refreshWidgets(_ call: CAPPluginCall) {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }
    
    @objc func isSupported(_ call: CAPPluginCall) {
        if #available(iOS 14.0, *) {
            call.resolve(["supported": true])
        } else {
            call.resolve(["supported": false])
        }
    }
    
    // MARK: - Handle URL Schemes (Widget Actions)
    
    public override func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleOpenURL(_:)),
            name: NSNotification.Name.capacitorOpenURL,
            object: nil
        )
    }
    
    @objc func handleOpenURL(_ notification: Notification) {
        guard let url = notification.object as? URL,
              url.scheme == "winterwatch" else { return }
        
        let action: String
        switch url.host {
        case "clockin":
            action = "CLOCK_IN"
        case "clockout":
            action = "CLOCK_OUT"
        case "dashboard":
            action = "OPEN_DASHBOARD"
        default:
            action = url.host ?? "UNKNOWN"
        }
        
        notifyListeners("widgetAction", data: ["action": action])
    }
}
