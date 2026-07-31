import Foundation
import Capacitor
import CoreLocation

@objc(DispatchLocation)
public class DispatchLocationPlugin: CAPPlugin, CAPBridgedPlugin, CLLocationManagerDelegate {
    public let identifier = "DispatchLocation"
    public let jsName = "DispatchLocation"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startTracking", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopTracking", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
    ]

    private var locationManager: CLLocationManager?
    private var endpoint: String = ""
    private var token: String = ""
    private var routeId: String?
    private var orderId: String?
    private var driverId: String?
    private var driverName: String = ""
    private var truck: String = ""
    private var active = false
    private var lastSentAt: Date?
    private var lastPingAt: String?

    @objc func startTracking(_ call: CAPPluginCall) {
        guard let endpoint = call.getString("endpoint"), !endpoint.isEmpty else {
            call.reject("endpoint is required")
            return
        }
        guard let token = call.getString("token"), !token.isEmpty else {
            call.reject("token is required")
            return
        }

        self.endpoint = endpoint
        self.token = token
        self.routeId = call.getString("routeId")
        self.orderId = call.getString("orderId")
        self.driverId = call.getString("driverId")
        self.driverName = call.getString("driverName") ?? "WinterWatch Driver"
        self.truck = call.getString("truck") ?? ""
        self.active = true

        let manager = locationManager ?? CLLocationManager()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
        manager.distanceFilter = 10
        manager.pausesLocationUpdatesAutomatically = false
        if #available(iOS 9.0, *) {
            manager.allowsBackgroundLocationUpdates = true
        }
        locationManager = manager

        let authorization = manager.authorizationStatus
        if authorization == .notDetermined {
            manager.requestAlwaysAuthorization()
        } else if authorization == .authorizedWhenInUse {
            manager.requestAlwaysAuthorization()
        }

        manager.startUpdatingLocation()
        call.resolve(["ok": true, "message": "Native dispatch GPS tracking started."])
    }

    @objc func stopTracking(_ call: CAPPluginCall) {
        active = false
        locationManager?.stopUpdatingLocation()
        call.resolve(["ok": true, "message": "Native dispatch GPS tracking stopped."])
    }

    @objc func status(_ call: CAPPluginCall) {
        call.resolve([
            "active": active,
            "routeId": routeId ?? NSNull(),
            "lastPingAt": lastPingAt ?? NSNull(),
            "message": active ? "Native dispatch GPS tracking active." : "Native dispatch GPS tracking stopped.",
        ])
    }

    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        if active {
            manager.startUpdatingLocation()
        }
    }

    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard active, let location = locations.last else { return }
        let now = Date()
        if let lastSentAt = lastSentAt, now.timeIntervalSince(lastSentAt) < 10 {
            return
        }

        lastSentAt = now
        sendLocation(location)
    }

    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        notifyListeners("dispatchLocationError", data: ["message": error.localizedDescription])
    }

    private func sendLocation(_ location: CLLocation) {
        guard let url = URL(string: endpoint) else { return }

        var payload: [String: Any] = [
            "routeId": routeId ?? NSNull(),
            "orderId": orderId ?? NSNull(),
            "driverId": driverId ?? NSNull(),
            "driverName": driverName,
            "truck": truck,
            "latitude": location.coordinate.latitude,
            "longitude": location.coordinate.longitude,
            "accuracy": location.horizontalAccuracy,
            "heading": location.course >= 0 ? location.course : NSNull(),
            "speed": location.speed >= 0 ? location.speed : NSNull(),
            "capturedAt": ISO8601DateFormatter().string(from: Date()),
        ]

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(token, forHTTPHeaderField: "X-Dispatch-Tracking-Token")
        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)

        URLSession.shared.dataTask(with: request) { [weak self] _, response, error in
            if let error = error {
                self?.notifyListeners("dispatchLocationError", data: ["message": error.localizedDescription])
                return
            }

            if let httpResponse = response as? HTTPURLResponse,
               !(200...299).contains(httpResponse.statusCode) {
                self?.notifyListeners("dispatchLocationError", data: ["message": "Dispatch GPS update failed with HTTP \(httpResponse.statusCode)."])
                return
            }

            let sentAt = ISO8601DateFormatter().string(from: Date())
            self?.lastPingAt = sentAt
            self?.notifyListeners("dispatchLocationPing", data: ["lastPingAt": sentAt])
        }.resume()
    }
}
