package com.espark.app.focus

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.provider.Settings
import android.util.Base64
import com.facebook.react.bridge.*
import java.io.ByteArrayOutputStream

/**
 * FocusProtectionModule
 * React Native bridge exposing real Android Accessibility detection,
 * real installed app enumeration (PackageManager), real app launching,
 * Device Administrator uninstallation prevention, Lock Task / Kiosk pinning,
 * and persistent focus protection state.
 */
class FocusProtectionModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "FocusProtectionModule"
    }

    /**
     * Check if ESpark's FocusAccessibilityService is genuinely enabled in Android Settings
     */
    @ReactMethod
    fun isAccessibilityServiceEnabled(promise: Promise) {
        try {
            val expectedServiceName = "${reactContext.packageName}/com.espark.app.focus.FocusAccessibilityService"
            val expectedShortName = "${reactContext.packageName}/.focus.FocusAccessibilityService"
            val enabledServices = Settings.Secure.getString(
                reactContext.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: ""

            val isEnabled = enabledServices.split(":").any { serviceStr ->
                serviceStr.equals(expectedServiceName, ignoreCase = true) ||
                serviceStr.equals(expectedShortName, ignoreCase = true) ||
                serviceStr.contains("FocusAccessibilityService", ignoreCase = true)
            }
            promise.resolve(isEnabled)
        } catch (e: Exception) {
            promise.reject("ACCESSIBILITY_CHECK_ERROR", e.message)
        }
    }

    /**
     * Open Android Accessibility Settings so the student can enable ESpark
     */
    @ReactMethod
    fun openAccessibilitySettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SETTINGS_INTENT_ERROR", e.message)
        }
    }

    /**
     * Retrieve REAL installed applications using Android PackageManager
     * Extracts application name, package name, isSystemApp flag, and real app icon as Base64 PNG.
     */
    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val pm = reactContext.packageManager
            val intent = Intent(Intent.ACTION_MAIN, null).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }
            val activities = pm.queryIntentActivities(intent, 0)
            val list = Arguments.createArray()
            val ownPackage = reactContext.packageName

            for (resolveInfo in activities) {
                val pkgName = resolveInfo.activityInfo.packageName
                if (pkgName == ownPackage) continue // Skip ESpark itself

                val appMap = Arguments.createMap()
                val label = resolveInfo.loadLabel(pm).toString()
                val isSystem = (resolveInfo.activityInfo.applicationInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0

                appMap.putString("name", label)
                appMap.putString("packageName", pkgName)
                appMap.putBoolean("isSystemApp", isSystem)
                appMap.putBoolean("launchable", true)

                // Extract real app icon as base64 PNG data URL
                try {
                    val iconDrawable = resolveInfo.loadIcon(pm)
                    val bitmap = drawableToBitmap(iconDrawable)
                    if (bitmap != null) {
                        val stream = ByteArrayOutputStream()
                        bitmap.compress(Bitmap.CompressFormat.PNG, 85, stream)
                        val byteArray = stream.toByteArray()
                        val base64 = Base64.encodeToString(byteArray, Base64.NO_WRAP)
                        appMap.putString("icon", "data:image/png;base64,$base64")
                    }
                } catch (e: Exception) {
                    // Fallback to null icon if extraction fails
                }

                list.pushMap(appMap)
            }
            promise.resolve(list)
        } catch (e: Exception) {
            promise.reject("PACKAGE_MANAGER_ERROR", e.message)
        }
    }

    /**
     * Launch a REAL installed Android application
     */
    @ReactMethod
    fun launchApp(packageName: String, promise: Promise) {
        try {
            val pm = reactContext.packageManager
            val launchIntent = pm.getLaunchIntentForPackage(packageName)
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactContext.startActivity(launchIntent)
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("LAUNCH_ERROR", e.message)
        }
    }

    /**
     * Synchronize active focus session with native Android SharedPreferences
     * so FocusAccessibilityService can enforce app restrictions.
     */
    @ReactMethod
    fun startFocusProtection(endTimeMs: Double, allowedPackagesList: ReadableArray, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("espark_focus_pref", Context.MODE_PRIVATE)
            val set = mutableSetOf<String>()
            for (i in 0 until allowedPackagesList.size()) {
                allowedPackagesList.getString(i)?.let { set.add(it) }
            }
            prefs.edit()
                .putBoolean("isFocusActive", true)
                .putLong("focusEndTime", endTimeMs.toLong())
                .putStringSet("allowedPackages", set)
                .apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("PREFS_WRITE_ERROR", e.message)
        }
    }

    /**
     * Stop focus protection in native SharedPreferences
     */
    @ReactMethod
    fun stopFocusProtection(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("espark_focus_pref", Context.MODE_PRIVATE)
            prefs.edit()
                .putBoolean("isFocusActive", false)
                .putLong("focusEndTime", 0L)
                .remove("allowedPackages")
                .apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("PREFS_CLEAR_ERROR", e.message)
        }
    }

    /**
     * Check if ESpark is an active Device Administrator (OS-level uninstall lock)
     */
    @ReactMethod
    fun isDeviceAdminActive(promise: Promise) {
        try {
            val dpm = reactContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
            val adminComponent = ComponentName(reactContext, FocusDeviceAdminReceiver::class.java)
            val isActive = dpm?.isAdminActive(adminComponent) ?: false
            promise.resolve(isActive)
        } catch (e: Exception) {
            promise.reject("DEVICE_ADMIN_CHECK_ERROR", e.message)
        }
    }

    /**
     * Request activation of Device Administrator to prevent uninstallation
     */
    @ReactMethod
    fun requestDeviceAdmin(promise: Promise) {
        try {
            val adminComponent = ComponentName(reactContext, FocusDeviceAdminReceiver::class.java)
            val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
                putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent)
                putExtra(
                    DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                    "ESpark uses Device Administrator to prevent uninstallation and phone power-off bypass during active study sessions."
                )
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DEVICE_ADMIN_REQUEST_ERROR", e.message)
        }
    }

    /**
     * Start Lock Task Mode (Screen Pinning / Kiosk Mode) during focus sessions
     */
    @ReactMethod
    fun startLockTask(promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity
            if (activity != null) {
                activity.startLockTask()
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("LOCK_TASK_ERROR", e.message)
        }
    }

    /**
     * Stop Lock Task Mode (Screen Pinning / Kiosk Mode)
     */
    @ReactMethod
    fun stopLockTask(promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity
            if (activity != null) {
                activity.stopLockTask()
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("STOP_LOCK_TASK_ERROR", e.message)
        }
    }

    private fun drawableToBitmap(drawable: Drawable): Bitmap? {
        if (drawable is BitmapDrawable) {
            return drawable.bitmap
        }
        val width = if (drawable.intrinsicWidth > 0) drawable.intrinsicWidth else 72
        val height = if (drawable.intrinsicHeight > 0) drawable.intrinsicHeight else 72
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, canvas.width, canvas.height)
        drawable.draw(canvas)
        return bitmap
    }
}
