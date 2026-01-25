import UIKit
import Capacitor
import WebKit
import OneSignalFramework

/// Custom bridge controller to mitigate iOS 18+ WKWebView gesture deferral issues
/// that can make the UI feel completely non-interactive (taps not delivered).
class BridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        // Ensure our local Swift plugin is always registered at runtime.
        // This is the most reliable approach when auto-registration is flaky.
        bridge?.registerPluginInstance(OneSignalBridgePlugin())
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        applyTouchMitigationsIfPossible()

        // WebView creation can happen slightly after viewDidLoad; re-apply next tick.
        DispatchQueue.main.async { [weak self] in
            self?.applyTouchMitigationsIfPossible()
        }
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        applyTouchMitigationsIfPossible()
    }

    private func applyTouchMitigationsIfPossible() {
        guard let webView = self.bridge?.webView else { return }

        let scrollView = webView.scrollView
        scrollView.delaysContentTouches = false
        scrollView.canCancelContentTouches = true

        // Prevent UIKit recognizers from swallowing the tap before it reaches WebKit.
        for recognizer in scrollView.gestureRecognizers ?? [] {
            recognizer.cancelsTouchesInView = false
        }

        if #available(iOS 16.4, *) {
            webView.configuration.preferences.isTextInteractionEnabled = true
        }
    }
    
    // NOTE:
    // Do not manually register OneSignalBridge here.
    // With Capacitor 5/6/7/8, local Swift plugins that conform to CAPBridgedPlugin
    // are auto-registered as long as their .swift file is included in the app target.
}
