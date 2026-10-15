package expo.modules.notifcapture

import android.content.Context
import android.provider.Settings
import android.util.Log
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

object CaptureHeartbeat {
  private val client by lazy {
    OkHttpClient.Builder().connectTimeout(10, TimeUnit.SECONDS).readTimeout(10, TimeUnit.SECONDS).build()
  }

  fun send(context: Context, ready: Boolean, reason: String? = null) {
    val baseUrl = CaptureConfig.getApiBaseUrl(context)?.takeIf { it.isNotBlank() } ?: return
    val token = CaptureConfig.getAuthToken(context)?.takeIf { it.isNotBlank() } ?: return
    val deviceId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
      ?.takeIf { it.isNotBlank() } ?: "${context.packageName}-android-device"
    val payload = JSONObject()
      .put("deviceId", deviceId)
      .put("ready", ready)
    if (!ready && reason != null) payload.put("reason", reason)
    val request = Request.Builder()
      .url("${baseUrl.trimEnd('/')}/transactions/capture/heartbeat")
      .header("Authorization", "Bearer $token")
      .post(payload.toString().toRequestBody("application/json; charset=utf-8".toMediaType()))
      .build()
    client.newCall(request).enqueue(object : Callback {
      override fun onFailure(call: Call, error: IOException) {
        Log.w("MatiStoreCapture", "Capture heartbeat failed: ${error.message}")
      }

      override fun onResponse(call: Call, response: Response) {
        if (response.code == 401 || response.code == 403) {
          Log.w("MatiStoreCapture", "Capture heartbeat rejected (${response.code}); admin must reconnect")
        }
        response.close()
      }
    })
  }
}
