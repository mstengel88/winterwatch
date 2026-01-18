// Android Widget for WinterWatch-Pro
// Add to: android/app/src/main/java/app/lovable/winterwatch/widget/

package app.lovable.winterwatch.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import java.text.SimpleDateFormat
import java.util.*

/**
 * WinterWatch Home Screen Widget
 * Shows shift status, weather, and quick actions
 */
class WinterWatchWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {
        // Widget placed for the first time
    }

    override fun onDisabled(context: Context) {
        // Last widget removed
    }

    companion object {
        private const val PREFS_NAME = "WinterWatchWidget"
        private const val PREF_SHIFT_ACTIVE = "shift_active"
        private const val PREF_SHIFT_START = "shift_start"
        private const val PREF_JOBS_COMPLETED = "jobs_completed"
        private const val PREF_TEMPERATURE = "temperature"
        private const val PREF_CONDITIONS = "conditions"

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            
            val isActive = prefs.getBoolean(PREF_SHIFT_ACTIVE, false)
            val shiftStart = prefs.getLong(PREF_SHIFT_START, 0)
            val jobsCompleted = prefs.getInt(PREF_JOBS_COMPLETED, 0)
            val temperature = prefs.getInt(PREF_TEMPERATURE, 32)
            val conditions = prefs.getString(PREF_CONDITIONS, "Unknown") ?: "Unknown"

            val views = RemoteViews(context.packageName, R.layout.widget_winterwatch)

            // Set weather info
            views.setTextViewText(R.id.widget_temperature, "${temperature}°F")
            views.setTextViewText(R.id.widget_conditions, conditions)

            // Set shift status
            if (isActive && shiftStart > 0) {
                val elapsed = System.currentTimeMillis() - shiftStart
                val hours = elapsed / (1000 * 60 * 60)
                val minutes = (elapsed / (1000 * 60)) % 60
                
                views.setTextViewText(R.id.widget_timer, String.format("%d:%02d", hours, minutes))
                views.setTextViewText(R.id.widget_status, "Shift Active")
                views.setInt(R.id.widget_status_indicator, "setBackgroundColor", 0xFF4CAF50.toInt())
                views.setTextViewText(R.id.widget_action_button, "End Shift")
            } else {
                views.setTextViewText(R.id.widget_timer, "0:00")
                views.setTextViewText(R.id.widget_status, "Off Duty")
                views.setInt(R.id.widget_status_indicator, "setBackgroundColor", 0xFF9E9E9E.toInt())
                views.setTextViewText(R.id.widget_action_button, "Start Shift")
            }

            views.setTextViewText(R.id.widget_jobs_count, "$jobsCompleted jobs today")

            // Set click intent to open app
            val intent = Intent(context, MainActivity::class.java).apply {
                action = if (isActive) "CLOCK_OUT" else "CLOCK_IN"
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context, 
                0, 
                intent, 
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_action_button, pendingIntent)

            // Open dashboard on widget tap
            val dashboardIntent = Intent(context, MainActivity::class.java).apply {
                action = "OPEN_DASHBOARD"
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val dashboardPendingIntent = PendingIntent.getActivity(
                context,
                1,
                dashboardIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_container, dashboardPendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        /**
         * Call this from your Capacitor plugin to update widget data
         */
        fun updateWidgetData(
            context: Context,
            isActive: Boolean,
            shiftStartTime: Long?,
            jobsCompleted: Int,
            temperature: Int,
            conditions: String
        ) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().apply {
                putBoolean(PREF_SHIFT_ACTIVE, isActive)
                putLong(PREF_SHIFT_START, shiftStartTime ?: 0)
                putInt(PREF_JOBS_COMPLETED, jobsCompleted)
                putInt(PREF_TEMPERATURE, temperature)
                putString(PREF_CONDITIONS, conditions)
                apply()
            }

            // Trigger widget refresh
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val widgetIds = appWidgetManager.getAppWidgetIds(
                android.content.ComponentName(context, WinterWatchWidget::class.java)
            )
            for (id in widgetIds) {
                updateAppWidget(context, appWidgetManager, id)
            }
        }
    }
}
