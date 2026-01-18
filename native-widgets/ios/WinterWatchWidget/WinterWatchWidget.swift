// iOS Widget Extension for WinterWatch-Pro
// Add this as a Widget Extension target in Xcode
// File > New > Target > Widget Extension

import WidgetKit
import SwiftUI

// MARK: - Data Models
struct ShiftStatus: Codable {
    let isActive: Bool
    let startTime: Date?
    let hoursWorked: Double
    let jobsCompleted: Int
    let temperature: Int
    let conditions: String
}

// MARK: - Timeline Provider
struct WinterWatchProvider: TimelineProvider {
    func placeholder(in context: Context) -> ShiftEntry {
        ShiftEntry(date: Date(), status: ShiftStatus(
            isActive: false,
            startTime: nil,
            hoursWorked: 0,
            jobsCompleted: 0,
            temperature: 32,
            conditions: "Snow"
        ))
    }

    func getSnapshot(in context: Context, completion: @escaping (ShiftEntry) -> ()) {
        // Load from UserDefaults (shared with app via App Groups)
        let status = loadShiftStatus()
        let entry = ShiftEntry(date: Date(), status: status)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ShiftEntry>) -> ()) {
        let status = loadShiftStatus()
        let entry = ShiftEntry(date: Date(), status: status)
        
        // Update every 5 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 5, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
    
    private func loadShiftStatus() -> ShiftStatus {
        // Access shared UserDefaults via App Groups
        guard let defaults = UserDefaults(suiteName: "group.app.lovable.winterwatch"),
              let data = defaults.data(forKey: "shiftStatus"),
              let status = try? JSONDecoder().decode(ShiftStatus.self, from: data) else {
            return ShiftStatus(isActive: false, startTime: nil, hoursWorked: 0, jobsCompleted: 0, temperature: 32, conditions: "Unknown")
        }
        return status
    }
}

// MARK: - Timeline Entry
struct ShiftEntry: TimelineEntry {
    let date: Date
    let status: ShiftStatus
}

// MARK: - Widget Views
struct WinterWatchWidgetEntryView: View {
    var entry: WinterWatchProvider.Entry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(status: entry.status)
        case .systemMedium:
            MediumWidgetView(status: entry.status)
        case .accessoryCircular:
            CircularWidgetView(status: entry.status)
        default:
            SmallWidgetView(status: entry.status)
        }
    }
}

// Small Widget (2x2)
struct SmallWidgetView: View {
    let status: ShiftStatus
    
    var body: some View {
        ZStack {
            LinearGradient(
                colors: status.isActive 
                    ? [Color.blue.opacity(0.8), Color.cyan.opacity(0.6)]
                    : [Color.gray.opacity(0.4), Color.gray.opacity(0.2)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "snowflake")
                        .font(.title2)
                        .foregroundColor(.white)
                    Spacer()
                    Text("\(status.temperature)°")
                        .font(.headline)
                        .foregroundColor(.white.opacity(0.9))
                }
                
                Spacer()
                
                if status.isActive {
                    Text(formatDuration(status.hoursWorked))
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                    
                    Text("Shift Active")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.8))
                } else {
                    Text("Off Duty")
                        .font(.headline)
                        .foregroundColor(.white)
                    
                    Text("Tap to start")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.7))
                }
            }
            .padding()
        }
        .widgetURL(URL(string: "winterwatch://clockin"))
    }
    
    private func formatDuration(_ hours: Double) -> String {
        let totalMinutes = Int(hours * 60)
        let h = totalMinutes / 60
        let m = totalMinutes % 60
        return String(format: "%d:%02d", h, m)
    }
}

// Medium Widget (4x2)
struct MediumWidgetView: View {
    let status: ShiftStatus
    
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color.blue.opacity(0.7), Color.purple.opacity(0.5)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            HStack(spacing: 16) {
                // Left: Status
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Image(systemName: "snowflake")
                            .font(.title3)
                        Text("WinterWatch")
                            .font(.headline)
                    }
                    .foregroundColor(.white)
                    
                    Spacer()
                    
                    if status.isActive {
                        Text(formatDuration(status.hoursWorked))
                            .font(.system(size: 32, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                        
                        HStack {
                            Circle()
                                .fill(Color.green)
                                .frame(width: 8, height: 8)
                            Text("Active Shift")
                                .font(.caption)
                        }
                        .foregroundColor(.white.opacity(0.9))
                    } else {
                        Text("Off Duty")
                            .font(.title2)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                    }
                }
                
                Spacer()
                
                // Right: Stats
                VStack(alignment: .trailing, spacing: 12) {
                    StatRow(icon: "thermometer", value: "\(status.temperature)°F")
                    StatRow(icon: "cloud.snow", value: status.conditions)
                    StatRow(icon: "checkmark.circle", value: "\(status.jobsCompleted) jobs")
                }
            }
            .padding()
        }
        .widgetURL(URL(string: "winterwatch://dashboard"))
    }
    
    private func formatDuration(_ hours: Double) -> String {
        let totalMinutes = Int(hours * 60)
        let h = totalMinutes / 60
        let m = totalMinutes % 60
        return String(format: "%d:%02d", h, m)
    }
}

struct StatRow: View {
    let icon: String
    let value: String
    
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.caption)
            Text(value)
                .font(.caption)
                .fontWeight(.medium)
        }
        .foregroundColor(.white.opacity(0.9))
    }
}

// Lock Screen Circular Widget
struct CircularWidgetView: View {
    let status: ShiftStatus
    
    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 2) {
                Image(systemName: status.isActive ? "clock.fill" : "snowflake")
                    .font(.caption)
                if status.isActive {
                    Text(formatShortDuration(status.hoursWorked))
                        .font(.caption2)
                        .fontWeight(.bold)
                }
            }
        }
    }
    
    private func formatShortDuration(_ hours: Double) -> String {
        let totalMinutes = Int(hours * 60)
        let h = totalMinutes / 60
        let m = totalMinutes % 60
        return "\(h):\(String(format: "%02d", m))"
    }
}

// MARK: - Widget Configuration
@main
struct WinterWatchWidget: Widget {
    let kind: String = "WinterWatchWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WinterWatchProvider()) { entry in
            WinterWatchWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("WinterWatch Shift")
        .description("View your current shift status and quick clock-in.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular])
    }
}

// MARK: - Preview
struct WinterWatchWidget_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            SmallWidgetView(status: ShiftStatus(
                isActive: true,
                startTime: Date().addingTimeInterval(-7200),
                hoursWorked: 2.5,
                jobsCompleted: 4,
                temperature: 28,
                conditions: "Snow"
            ))
            .previewContext(WidgetPreviewContext(family: .systemSmall))
            
            MediumWidgetView(status: ShiftStatus(
                isActive: true,
                startTime: Date().addingTimeInterval(-7200),
                hoursWorked: 2.5,
                jobsCompleted: 4,
                temperature: 28,
                conditions: "Light Snow"
            ))
            .previewContext(WidgetPreviewContext(family: .systemMedium))
        }
    }
}
