package expo.modules.notifcapture

import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray

class ExpoNotifCaptureModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoNotifCapture")

    Function("hasPermission") {
      val context = appContext.reactContext ?: return@Function false
      val enabled = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners") ?: return@Function false
      enabled.split(':').any { component -> component.startsWith(context.packageName + "/") }
    }

    Function("isAdminCaptureEnabled") {
      val context = appContext.reactContext ?: return@Function false
      CaptureConfig.isEnabled(context) && CaptureConfig.shouldSendToBackend(context)
    }

    Function("reportCaptureStatus") { ready: Boolean, reason: String? ->
      val context = appContext.reactContext ?: return@Function null
      CaptureHeartbeat.send(context, ready, reason)
    }

    Function("openSettings") {
      val context = appContext.reactContext ?: return@Function null
      context.startActivity(Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS").apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      })
    }

    Function("configureAdminCapture") { apiBaseUrl: String, authToken: String, watchesJson: String, debugEnabled: Boolean ->
      val context = appContext.reactContext ?: return@Function null
      CaptureConfig.save(context, apiBaseUrl, authToken, parseWatches(watchesJson), backendEnabled = true, debugEnabled = debugEnabled)
    }

    Function("stopCapture") {
      appContext.reactContext?.let(CaptureConfig::clear)
    }
  }

  private fun parseWatches(raw: String): List<OperatorWatch> {
    val array = JSONArray(raw)
    return (0 until array.length()).map { index ->
      val item = array.getJSONObject(index)
      OperatorWatch(
        item.getString("packageName"),
        item.optString("title"),
        item.getString("pattern"),
        item.getString("operateurNom"),
      )
    }.filter { it.pattern.isNotBlank() }
  }
}
