package expo.modules.notifcapture

import android.app.Notification
import android.os.Handler
import android.os.Looper
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
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
import java.security.MessageDigest
import java.util.concurrent.TimeUnit

class ExpoNotifListenerService : NotificationListenerService() {
  private val debugTag = "MatiStoreCapture"
  private val retryHandler by lazy { Handler(Looper.getMainLooper()) }
  private val retryDelaysMs = listOf(1_500L, 3_000L, 5_000L, 8_000L, 12_000L, 15_000L, 20_000L, 30_000L, 45_000L, 60_000L, 60_000L)
  private val client by lazy {
    OkHttpClient.Builder().connectTimeout(10, TimeUnit.SECONDS).readTimeout(10, TimeUnit.SECONDS).build()
  }
  private val heartbeatRunnable = object : Runnable {
    override fun run() {
      if (CaptureConfig.isEnabled(applicationContext) && CaptureConfig.shouldSendToBackend(applicationContext)) {
        CaptureHeartbeat.send(applicationContext, true)
      } else {
        CaptureHeartbeat.send(applicationContext, false, "capture_not_configured")
      }
      retryHandler.postDelayed(this, 60_000L)
    }
  }

  override fun onListenerConnected() {
    super.onListenerConnected()
    retryHandler.removeCallbacks(heartbeatRunnable)
    CaptureHeartbeat.send(applicationContext, true)
    retryHandler.postDelayed(heartbeatRunnable, 60_000L)
  }

  override fun onListenerDisconnected() {
    retryHandler.removeCallbacks(heartbeatRunnable)
    CaptureHeartbeat.send(applicationContext, false, "notification_access_required")
    super.onListenerDisconnected()
  }

  override fun onDestroy() {
    retryHandler.removeCallbacks(heartbeatRunnable)
    super.onDestroy()
  }

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    val context = applicationContext
    if (!CaptureConfig.isEnabled(context)) return
    val extras = sbn.notification.extras
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
    val body = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
      ?: extras.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty()
    val fullText = "$title $body".trim()
    val watches = CaptureConfig.getWatches(context)
    val applicable = watches.filter { watch ->
      val packageMatches = watch.packageName.isBlank() || watch.packageName == sbn.packageName
      val titleMatches = watch.title.isBlank() || watch.title.equals(title.trim(), ignoreCase = true)
      val looksLikePayment = fullText.isNotEmpty()
        && runCatching { Regex(watch.pattern).containsMatchIn(fullText) }.getOrDefault(false)
      if (CaptureConfig.isDebugEnabled(context) && packageMatches && !titleMatches && looksLikePayment) {
        Log.d(debugTag, JSONObject()
          .put("event", "notification-filtered")
          .put("operator", watch.operateurNom)
          .put("reason", "Android notification title does not match configured title")
          .put("expectedTitle", watch.title)
          .put("title", title)
          .put("content", fullText)
          .put("extracted", extractForDebug(watch, fullText))
          .toString())
      }
      packageMatches && titleMatches
    }
    if (applicable.isEmpty()) return

    if (fullText.isEmpty()) return

    if (!CaptureConfig.shouldSendToBackend(context)) {
      debugLog(JSONObject()
        .put("event", "capture-stopped")
        .put("reason", "Backend capture is disabled"))
      return
    }

    applicable.forEach { watch -> tryMatchAndSend(context, sbn, watch, title, body, fullText) }
  }

  private fun tryMatchAndSend(
    context: android.content.Context,
    sbn: StatusBarNotification,
    watch: OperatorWatch,
    title: String,
    body: String,
    fullText: String,
  ) {
    val match = try {
      Regex(watch.pattern).find(fullText)
    } catch (error: Exception) {
      debugLog(JSONObject()
        .put("event", "notification-rejected-locally")
        .put("operator", watch.operateurNom)
        .put("reason", "Invalid notification regex: ${error.message}")
        .put("title", title)
        .put("content", fullText))
      return
    }
    if (match == null) {
      debugLog(JSONObject()
        .put("event", "notification-rejected-locally")
        .put("operator", watch.operateurNom)
        .put("reason", "Notification text does not match configured regex")
        .put("title", title)
        .put("content", fullText))
      return
    }
    val rawAmount = match.groups["montant"]?.value
    if (rawAmount == null) {
      debugLog(JSONObject()
        .put("event", "notification-rejected-locally")
        .put("operator", watch.operateurNom)
        .put("reason", "Regex did not extract amount")
        .put("title", title)
        .put("content", fullText))
      return
    }
    // Flooz écrit par exemple « 3 000,00 FCFA » : les deux décimales ne sont pas des FCFA.
    val amount = rawAmount.replace(Regex("\\s"), "")
      .replace(Regex("[,.]\\d{2}$"), "")
      .replace(Regex("[^0-9]"), "")
      .toIntOrNull()
    if (amount == null || amount <= 0) {
      debugLog(JSONObject()
        .put("event", "notification-rejected-locally")
        .put("operator", watch.operateurNom)
        .put("reason", "Extracted amount is not a positive integer")
        .put("rawAmount", rawAmount)
        .put("title", title)
        .put("content", fullText))
      return
    }
    val reference = match.groups["reference"]?.value?.trim()?.takeIf { it.isNotEmpty() }
    if (reference == null) {
      debugLog(JSONObject()
        .put("event", "notification-rejected-locally")
        .put("operator", watch.operateurNom)
        .put("reason", "Regex did not extract a payment reference")
        .put("amount", amount)
        .put("title", title)
        .put("content", fullText))
      return
    }
    val phone = match.groups["telephone"]?.value?.takeIf { it.isNotBlank() }
    if (phone == null) {
      debugLog(JSONObject()
        .put("event", "notification-rejected-locally")
        .put("operator", watch.operateurNom)
        .put("reason", "Regex did not extract client phone number")
        .put("amount", amount)
        .put("reference", reference)
        .put("title", title)
        .put("content", fullText))
      return
    }
    debugLog(JSONObject()
      .put("event", "notification-parsed")
      .put("operator", watch.operateurNom)
      .put("package", sbn.packageName)
      .put("title", title)
      .put("content", fullText)
      .put("amount", amount)
      .put("reference", reference)
      .put("phone", phone))
    val fingerprintSource = "${sbn.packageName}|${sbn.id}|${watch.operateurNom}|$title|$body"
    val fingerprint = MessageDigest.getInstance("SHA-256")
      .digest(fingerprintSource.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }
    if (CaptureConfig.wasNotificationHandled(context, fingerprint)) {
      debugLog(JSONObject()
        .put("event", "notification-skipped")
        .put("operator", watch.operateurNom)
        .put("reason", "Notification fingerprint was already handled")
        .put("reference", reference))
      return
    }

    val apiBaseUrl = CaptureConfig.getApiBaseUrl(context)?.takeIf { it.isNotBlank() }
    if (apiBaseUrl == null) {
      debugLog(JSONObject().put("event", "capture-failed").put("reason", "API base URL is missing"))
      return
    }
    val authToken = CaptureConfig.getAuthToken(context)?.takeIf { it.isNotBlank() }
    if (authToken == null) {
      debugLog(JSONObject().put("event", "capture-failed").put("reason", "Admin auth token is missing"))
      return
    }
    val payload = JSONObject()
      .put("operateur", watch.operateurNom)
      .put("montant", amount)
      .put("notificationPostedAt", sbn.postTime)
      .put("notificationBrute", fullText)
      .put("packageNotification", sbn.packageName)
      .put("titreNotification", title.trim())
    payload.put("numeroTelephoneClient", phone)
    val request = Request.Builder()
      .url("${apiBaseUrl.trimEnd('/')}/transactions/admin-capture")
      .header("Authorization", "Bearer $authToken")
      .post(payload.toString().toRequestBody("application/json; charset=utf-8".toMediaType()))
      .build()
    sendCaptureRequest(context, fingerprint, request, watch.operateurNom)
  }

  private fun sendCaptureRequest(
    context: android.content.Context,
    fingerprint: String,
    request: Request,
    operatorName: String,
    attempt: Int = 0,
  ) {
    client.newCall(request).enqueue(object : Callback {
      override fun onFailure(call: Call, e: IOException) {
        debugLog(JSONObject()
          .put("event", "capture-network-error")
          .put("operator", operatorName)
          .put("url", request.url.toString())
          .put("reason", e.message ?: e.javaClass.simpleName))
        scheduleRetry(context, fingerprint, request, operatorName, attempt)
      }

      override fun onResponse(call: Call, response: Response) {
        var matched = false
        var retryable = !response.isSuccessful
        try {
          val responseText = response.body?.string().orEmpty()
          if (response.isSuccessful) {
            val payload = JSONObject(responseText)
            val data = payload.optJSONObject("data")
            matched = data?.optBoolean("matched") == true
            retryable = data?.optBoolean("retryable") == true
            debugLog(JSONObject()
              .put("event", if (matched) "capture-accepted" else "capture-rejected")
              .put("operator", operatorName)
              .put("transactionId", data?.optString("transactionId") ?: JSONObject.NULL)
              .put("reason", data?.optString("reason") ?: payload.optString("message", "No reason returned"))
              .put("message", data?.optString("message") ?: payload.optString("message"))
              .put("extracted", data?.optJSONObject("extracted") ?: JSONObject.NULL)
              .put("retryable", retryable))
          } else {
            debugLog(JSONObject()
              .put("event", "capture-http-error")
              .put("operator", operatorName)
              .put("status", response.code)
              .put("body", responseText))
          }
        } catch (error: Exception) {
          debugLog(JSONObject()
            .put("event", "capture-response-error")
            .put("operator", operatorName)
            .put("reason", error.message ?: error.javaClass.simpleName))
          retryable = true
        } finally {
          response.close()
        }

        if (matched || !retryable) {
          CaptureConfig.markNotificationHandled(context, fingerprint)
        } else {
          scheduleRetry(context, fingerprint, request, operatorName, attempt)
        }
      }
    })
  }

  private fun scheduleRetry(
    context: android.content.Context,
    fingerprint: String,
    request: Request,
    operatorName: String,
    attempt: Int,
  ) {
    if (attempt >= retryDelaysMs.size || CaptureConfig.wasNotificationHandled(context, fingerprint)) return
    retryHandler.postDelayed({
      if (!CaptureConfig.wasNotificationHandled(context, fingerprint)) {
        sendCaptureRequest(context, fingerprint, request, operatorName, attempt + 1)
      }
    }, retryDelaysMs[attempt])
  }

  private fun debugLog(details: JSONObject) {
    if (CaptureConfig.isDebugEnabled(applicationContext)) {
      Log.d(debugTag, details.toString())
    }
  }

  private fun extractForDebug(watch: OperatorWatch, fullText: String): JSONObject {
    val match = runCatching { Regex(watch.pattern).find(fullText) }.getOrNull()
      ?: return JSONObject()
    val rawAmount = match.groups["montant"]?.value
    val amount = rawAmount
      ?.replace(Regex("\\s"), "")
      ?.replace(Regex("[,.]\\d{2}$"), "")
      ?.replace(Regex("[^0-9]"), "")
      ?.toIntOrNull()
    return JSONObject()
      .put("montantBrut", rawAmount ?: JSONObject.NULL)
      .put("montant", amount ?: JSONObject.NULL)
      .put("reference", match.groups["reference"]?.value?.trim() ?: JSONObject.NULL)
      .put("telephone", match.groups["telephone"]?.value?.trim() ?: JSONObject.NULL)
  }
}
