package expo.modules.ussddialer

import android.app.AlertDialog
import android.net.Uri
import android.os.Bundle
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.atomic.AtomicBoolean

class ExpoUssdDialerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoUssdDialer")

    AsyncFunction("dialUssd") { ussdCode: String, promise: Promise ->
      val context = appContext.reactContext
      val activity = appContext.currentActivity
      if (context == null || activity == null) {
        promise.reject("NO_ACTIVITY", "Android activity is unavailable", null)
        return@AsyncFunction
      }

      val telecomManager = context.getSystemService(TelecomManager::class.java)
      if (telecomManager == null) {
        promise.reject("NO_TELECOM", "Android Telecom service is unavailable", null)
        return@AsyncFunction
      }

      val accounts = try {
        telecomManager.callCapablePhoneAccounts
      } catch (error: SecurityException) {
        promise.reject("PHONE_PERMISSION_REQUIRED", "Phone state permission is required to select a SIM", error)
        return@AsyncFunction
      }

      if (accounts.isNullOrEmpty()) {
        promise.reject("NO_SIM_ACCOUNT", "No calling SIM account is available", null)
        return@AsyncFunction
      }

      val settled = AtomicBoolean(false)
      fun rejectOnce(code: String, message: String, cause: Throwable? = null) {
        if (settled.compareAndSet(false, true)) promise.reject(code, message, cause)
      }

      fun placeUssdCall(handle: PhoneAccountHandle) {
        try {
          val extras = Bundle().apply {
            putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, handle)
          }
          telecomManager.placeCall(Uri.fromParts("tel", ussdCode, null), extras)
          if (settled.compareAndSet(false, true)) promise.resolve(null)
        } catch (error: SecurityException) {
          rejectOnce("PERMISSION_DENIED", "CALL_PHONE permission was denied", error)
        } catch (error: Exception) {
          rejectOnce("USSD_ERROR", error.message ?: "Unable to launch USSD", error)
        }
      }

      activity.runOnUiThread {
        if (accounts.size == 1) {
          placeUssdCall(accounts[0])
          return@runOnUiThread
        }

        val labels = accounts.mapIndexed { index, handle ->
          val account = telecomManager.getPhoneAccount(handle)
          account?.label?.toString()?.takeIf { it.isNotBlank() } ?: "SIM ${index + 1}"
        }.toTypedArray()

        AlertDialog.Builder(activity)
          .setTitle("Choisir la carte SIM")
          .setItems(labels) { _, which -> placeUssdCall(accounts[which]) }
          .setOnCancelListener {
            rejectOnce("USSD_CANCELLED", "SIM selection was cancelled")
          }
          .show()
      }
    }
  }
}
