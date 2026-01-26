import UIKit
import Capacitor
import WebKit
import OneSignalFramework

/// Custom bridge controller to mitigate iOS 18+ WKWebView gesture deferral issues
/// that can make the UI feel completely non-interactive (taps not delivered).
/// Also includes performance optimizations for faster rendering.
class BridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        // Ensure our local Swift plugin is always registered at runtime.
        // This is the most reliable approach when auto-registration is flaky.
        bridge?.registerPluginInstance(OneSignalBridgePlugin())
        
        // Apply performance optimizations after bridge loads
        applyPerformanceOptimizations()
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
    
    /// Performance optimizations for WKWebView
    private func applyPerformanceOptimizations() {
        guard let webView = self.bridge?.webView else { return }
        
        // Enable hardware acceleration and optimize rendering
        webView.isOpaque = true
        webView.backgroundColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1) // #0f172a
        
        // Optimize scroll performance
        webView.scrollView.showsVerticalScrollIndicator = false
        webView.scrollView.showsHorizontalScrollIndicator = false
        webView.scrollView.bounces = true
        webView.scrollView.bouncesZoom = false
        
        // Disable unnecessary features for performance
        webView.allowsBackForwardNavigationGestures = false
        
        // Memory optimization: enable automatic cleanup
        if #available(iOS 14.0, *) {
            webView.configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        }
        
        // Configure content mode for retina displays
        webView.contentMode = .scaleToFill
        
        // Reduce memory footprint
        webView.scrollView.contentInsetAdjustmentBehavior = .never
    }
    
    // NOTE:
    // Do not manually register OneSignalBridge here.
    // With Capacitor 5/6/7/8, local Swift plugins that conform to CAPBridgedPlugin
    // are auto-registered as long as their .swift file is included in the app target.
}
