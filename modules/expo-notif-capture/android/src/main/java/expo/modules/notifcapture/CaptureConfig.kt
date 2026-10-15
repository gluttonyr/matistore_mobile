package expo.modules.notifcapture

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

data class OperatorWatch(val packageName: String, val title: String, val pattern: String, val operateurNom: String)

object CaptureConfig {
  private const val PREFS = "expo_notif_capture_prefs"
  private const val KEY_ALIAS = "matistore_notif_capture_token"

  fun save(
    context: Context,
    apiBaseUrl: String,
    authToken: String?,
    watches: List<OperatorWatch>,
    backendEnabled: Boolean,
    debugEnabled: Boolean = false,
  ) {
    val watchesJson = JSONArray().apply {
      watches.forEach { watch ->
        put(JSONObject()
          .put("packageName", watch.packageName)
          .put("title", watch.title)
          .put("pattern", watch.pattern)
          .put("operateurNom", watch.operateurNom))
      }
    }
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val editor = prefs.edit()
      .putString("apiBaseUrl", apiBaseUrl.trimEnd('/'))
      .putString("watches", watchesJson.toString())
      .putBoolean("backendEnabled", backendEnabled)
      .putBoolean("debugEnabled", debugEnabled)
      .putBoolean("enabled", watches.isNotEmpty())
      .remove("handledNotifications")
    if (backendEnabled && !authToken.isNullOrBlank()) editor.putString("authTokenEncrypted", encrypt(authToken))
    else editor.remove("authTokenEncrypted")
    editor.apply()
  }

  fun clear(context: Context) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
  }

  fun isEnabled(context: Context) = prefs(context).getBoolean("enabled", false)
  fun shouldSendToBackend(context: Context) = prefs(context).getBoolean("backendEnabled", false)
  fun isDebugEnabled(context: Context) = prefs(context).getBoolean("debugEnabled", false)
  fun getApiBaseUrl(context: Context) = prefs(context).getString("apiBaseUrl", null)
  fun getAuthToken(context: Context): String? = prefs(context).getString("authTokenEncrypted", null)?.let {
    runCatching { decrypt(it) }.getOrNull()
  }

  fun getWatches(context: Context): List<OperatorWatch> = runCatching {
    val raw = prefs(context).getString("watches", null) ?: return emptyList()
    val arr = JSONArray(raw)
    (0 until arr.length()).map { i ->
      val item = arr.getJSONObject(i)
      OperatorWatch(
        item.getString("packageName"),
        item.optString("title"),
        item.getString("pattern"),
        item.getString("operateurNom"),
      )
    }
  }.getOrDefault(emptyList())

  @Synchronized
  fun wasNotificationHandled(context: Context, fingerprint: String): Boolean {
    val now = System.currentTimeMillis()
    val prior = runCatching { JSONArray(prefs(context).getString("handledNotifications", "[]")) }.getOrDefault(JSONArray())
    return (0 until prior.length()).any { index ->
      val item = prior.optJSONObject(index) ?: return@any false
      now - item.optLong("at") < 10 * 60 * 1000L && item.optString("id") == fingerprint
    }
  }

  @Synchronized
  fun markNotificationHandled(context: Context, fingerprint: String): Boolean {
    val prefs = prefs(context)
    val now = System.currentTimeMillis()
    val prior = runCatching { JSONArray(prefs.getString("handledNotifications", "[]")) }.getOrDefault(JSONArray())
    val retained = JSONArray()
    var duplicate = false
    for (i in 0 until prior.length()) {
      val item = prior.optJSONObject(i) ?: continue
      val timestamp = item.optLong("at")
      if (now - timestamp < 10 * 60 * 1000L) {
        if (item.optString("id") == fingerprint) duplicate = true
        retained.put(item)
      }
    }
    if (duplicate) return false
    retained.put(JSONObject().put("id", fingerprint).put("at", now))
    while (retained.length() > 100) retained.remove(0)
    prefs.edit().putString("handledNotifications", retained.toString()).apply()
    return true
  }

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun secretKey(): SecretKey {
    val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    (store.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
    val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
    generator.init(KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
      .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
      .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
      .setRandomizedEncryptionRequired(true)
      .build())
    return generator.generateKey()
  }

  private fun encrypt(value: String): String {
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.ENCRYPT_MODE, secretKey())
    val encrypted = cipher.doFinal(value.toByteArray(Charsets.UTF_8))
    return Base64.encodeToString(cipher.iv + encrypted, Base64.NO_WRAP)
  }

  private fun decrypt(value: String): String {
    val payload = Base64.decode(value, Base64.NO_WRAP)
    require(payload.size > 12) { "Invalid encrypted token" }
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.DECRYPT_MODE, secretKey(), GCMParameterSpec(128, payload.copyOfRange(0, 12)))
    return String(cipher.doFinal(payload.copyOfRange(12, payload.size)), Charsets.UTF_8)
  }
}
