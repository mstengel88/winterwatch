import Foundation
import Capacitor
import OneSignalFramework

/// A minimal Capacitor plugin that exposes OneSignal's native iOS SDK to JavaScript.
/// This bypasses the Cordova plugin (onesignal-cordova-plugin) which has plugin injection issues.
@objc(OneSignalBridge)
public class OneSignalBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    
    // Use the same identifier/jsName as the JavaScript side expects:
    // registerPlugin('OneSignalBridge')
    public let identifier = "OneSignalBridge"
    public let jsName = "OneSignalBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getSubscriptionId", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPushToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPermissionStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "login", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "logout", returnType: CAPPluginReturnPromise),
    ]
    
    /// Returns the OneSignal subscription ID (player_id equivalent)
    @objc func getSubscriptionId(_ call: CAPPluginCall) {
        let subscriptionId = OneSignal.User.pushSubscription.id
        call.resolve(["subscriptionId": subscriptionId ?? NSNull()])
    }
    
    /// Returns the APNs push token
    @objc func getPushToken(_ call: CAPPluginCall) {
        let token = OneSignal.User.pushSubscription.token
        call.resolve(["token": token ?? NSNull()])
    }
    
    /// Returns the current permission status
    @objc func getPermissionStatus(_ call: CAPPluginCall) {
        let hasPermission = OneSignal.Notifications.permission
        call.resolve(["granted": hasPermission])
    }
    
    /// Requests notification permission from the user
    @objc func requestPermission(_ call: CAPPluginCall) {
        OneSignal.Notifications.requestPermission({ accepted in
            call.resolve(["accepted": accepted])
        }, fallbackToSettings: true)
    }
    
    /// Associates the OneSignal user with an external ID (Supabase user ID)
    @objc func login(_ call: CAPPluginCall) {
        guard let externalId = call.getString("externalId") else {
            call.reject("externalId is required")
            return
        }
        OneSignal.login(externalId)
        call.resolve(["success": true])
    }
    
    /// Logs out the current user from OneSignal
    @objc func logout(_ call: CAPPluginCall) {
        OneSignal.logout()
        call.resolve(["success": true])
    }
}
