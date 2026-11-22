package expo.modules.ussddialer

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Launches a Mobile Money USSD code.
 *
 * - With the CALL_PHONE permission: the code runs at once (ACTION_CALL, the standard way that works
 *   on Tecno, Infinix, itel, Xiaomi…), after a SIM choice when the phone has several SIMs.
 * - Without it, or when anything goes wrong: the phone's dialer opens with the code filled in.
 *
 * It never throws and never crashes the app: it resolves "CALLED" or "DIALER", and rejects only
 * when even the dialer cannot be opened.
 */
class ExpoUssdDialerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoUssdDialer")

    AsyncFunction("dialUssd") { ussdCode: String, promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("NO_ACTIVITY", "Android activity is unavailable", null)
        return@AsyncFunction
      }

      val settled = AtomicBoolean(false)
      fun resolveOnce(value: String) {
        if (settled.compareAndSet(false, true)) promise.resolve(value)
      }
      fun rejectOnce(code: String, message: String, cause: Throwable? = null) {
        if (settled.compareAndSet(false, true)) promise.reject(code, message, cause)
      }

      val uri = Uri.parse("tel:" + Uri.encode(ussdCode))

      fun openDialer() {
        try {
          activity.startActivity(Intent(Intent.ACTION_DIAL, uri))
          resolveOnce("DIALER")
        } catch (error: Throwable) {
          rejectOnce("NO_DIALER", error.message ?: "No dialer app", error)
        }
      }

      fun call(handle: PhoneAccountHandle?) {
        try {
          val intent = Intent(Intent.ACTION_CALL, uri)
          if (handle != null) {
            intent.putExtra(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, handle)
          }
          activity.startActivity(intent)
          resolveOnce("CALLED")
        } catch (error: Throwable) {
          openDialer()
        }
      }

      activity.runOnUiThread {
        try {
          if (!hasPermission(activity, Manifest.permission.CALL_PHONE)) {
            openDialer()
            return@runOnUiThread
          }

          // SIM list: only readable with READ_PHONE_STATE; otherwise the phone uses its default SIM.
          val telecom = activity.getSystemService(TelecomManager::class.java)
          val accounts: List<PhoneAccountHandle> = try {
            if (telecom != null && hasPermission(activity, Manifest.permission.READ_PHONE_STATE)) {
              telecom.callCapablePhoneAccounts ?: emptyList()
            } else {
              emptyList()
            }
          } catch (error: Throwable) {
            emptyList()
          }

          if (accounts.size <= 1 || activity.isFinishing) {
            call(accounts.firstOrNull())
            return@runOnUiThread
          }

          val labels = accounts.mapIndexed { index, handle ->
            val label = try {
              telecom?.getPhoneAccount(handle)?.label?.toString()
            } catch (error: Throwable) {
              null
            }
            label?.takeIf { it.isNotBlank() } ?: "SIM ${index + 1}"
          }.toTypedArray()

          AlertDialog.Builder(activity)
            .setTitle("Choisir la carte SIM")
            .setItems(labels) { _, which -> call(accounts[which]) }
            .setOnCancelListener { rejectOnce("USSD_CANCELLED", "SIM selection was cancelled") }
            .show()
        } catch (error: Throwable) {
          // Whatever happened (dialog refused, Telecom error…): fall back to the dialer.
          openDialer()
        }
      }
    }
  }

  private fun hasPermission(activity: Activity, permission: String): Boolean =
    activity.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED
}
