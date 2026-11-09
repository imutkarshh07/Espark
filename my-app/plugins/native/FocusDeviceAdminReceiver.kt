package com.espark.app.focus

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.widget.Toast

/**
 * FocusDeviceAdminReceiver
 * Native Android Device Administrator Receiver for ESpark Focus Protection.
 * While Device Administrator permission is active, the Android OS kernel directly
 * prevents uninstallation of the ESpark application.
 */
class FocusDeviceAdminReceiver : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Toast.makeText(
            context,
            "🔒 ESpark Uninstall Protection Activated",
            Toast.LENGTH_LONG
        ).show()
    }

    override fun onDisableRequested(context: Context, intent: Intent): CharSequence? {
        val prefs = context.getSharedPreferences("espark_focus_pref", Context.MODE_PRIVATE)
        val isFocusActive = prefs.getBoolean("isFocusActive", false)
        val focusEndTime = prefs.getLong("focusEndTime", 0L)

        if (isFocusActive && System.currentTimeMillis() < focusEndTime) {
            return "⚠️ FOCUS PROTECTION ACTIVE: Deactivating uninstall protection during an ongoing study session is restricted to safeguard your learning consistency and streak!"
        }
        return "Deactivating will allow the ESpark application to be uninstalled."
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        Toast.makeText(
            context,
            "ESpark Uninstall Protection Deactivated",
            Toast.LENGTH_SHORT
        ).show()
    }
}
