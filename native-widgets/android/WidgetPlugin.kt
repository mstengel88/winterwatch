/**
 * WinterWatch Widget Capacitor Plugin - Android Implementation
 * Syncs shift data between the web app and Android home screen widgets
 *
 * Add to your Android project:
 * 1. Copy this file to android/app/src/main/java/app/lovable/winterwatch/plugins/WidgetPlugin.kt
 * 2. Register in MainActivity.kt
 */

package app.lovable.winterwatch.plugins

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.JSObject
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

@CapacitorPlugin(name = "Widget")
class WidgetPlugin : Plugin() {

    companion object {
        private const val PREFS_NAME = "WinterWatchWidget"
        private const val DATA_KEY = "shiftData"
    }

    private val prefs: SharedPreferences by lazy {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    @PluginMethod
    fun updateShiftStatus(call: PluginCall) {
        val data = JSONObject().apply {
            put("isActive", call.getBoolean("isActive", false))
            put("shiftStartTime", call.getString("shiftStartTime", ""))
            put("hoursWorked", call.getDouble("hoursWorked", 0.0))
            put("jobsCompleted", call.getInt("jobsCompleted", 0))
            put("temperature", call.getInt("temperature", 32))
            put("conditions", call.getString("conditions", "Unknown"))
            put("isCheckedIn", call.getBoolean("isCheckedIn", false))
            put("currentLocation", call.getString("currentLocation", ""))
            put("employeeName", call.getString("employeeName", ""))
            put("updatedAt", SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).format(Date()))
        }

        // Save to SharedPreferences
        prefs.edit().putString(DATA_KEY, data.toString()).apply()

        // Update widgets
        refreshAllWidgets()

        call.resolve()
    }

    @PluginMethod
    fun getWidgetData(call: PluginCall) {
        val dataString = prefs.getString(DATA_KEY, null)
        
        if (dataString != null) {
            try {
                val data = JSONObject(dataString)
                val result = JSObject()
                
                result.put("isActive", data.optBoolean("isActive", false))
                result.put("shiftStartTime", data.optString("shiftStartTime", ""))
                result.put("hoursWorked", data.optDouble("hoursWorked", 0.0))
                result.put("jobsCompleted", data.optInt("jobsCompleted", 0))
                result.put("temperature", data.optInt("temperature", 32))
                result.put("conditions", data.optString("conditions", "Unknown"))
                result.put("isCheckedIn", data.optBoolean("isCheckedIn", false))
                result.put("currentLocation", data.optString("currentLocation", ""))
                result.put("employeeName", data.optString("employeeName", ""))
                
                call.resolve(result)
            } catch (e: Exception) {
                call.resolve(JSObject())
            }
        } else {
            call.resolve(JSObject())
        }
    }

    @PluginMethod
    fun refreshWidgets(call: PluginCall) {
        refreshAllWidgets()
        call.resolve()
    }

    @PluginMethod
    fun isSupported(call: PluginCall) {
        val result = JSObject()
        result.put("supported", true)
        call.resolve(result)
    }

    private fun refreshAllWidgets() {
        try {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val widgetComponent = ComponentName(context, WinterWatchWidget::class.java)
            val widgetIds = appWidgetManager.getAppWidgetIds(widgetComponent)

            if (widgetIds.isNotEmpty()) {
                // Send broadcast to update widgets
                val intent = Intent(context, WinterWatchWidget::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds)
                }
                context.sendBroadcast(intent)
            }
        } catch (e: Exception) {
            // Widget class might not exist yet
            android.util.Log.w("WidgetPlugin", "Failed to refresh widgets: ${e.message}")
        }
    }

    override fun handleOnNewIntent(intent: Intent) {
        super.handleOnNewIntent(intent)
        
        val action = intent.action
        if (action in listOf("CLOCK_IN", "CLOCK_OUT", "OPEN_DASHBOARD")) {
            val data = JSObject()
            data.put("action", action)
            notifyListeners("widgetAction", data)
        }
    }
}
