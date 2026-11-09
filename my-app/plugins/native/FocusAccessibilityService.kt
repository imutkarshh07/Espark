package com.espark.app.focus

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.Toast

/**
 * FocusAccessibilityService
 * Advanced Android Accessibility Service for ESpark Focus Protection.
 * 1. Blocks distracting applications and redirects to ESpark during active focus.
 * 2. Intercepts and collapses the Power Menu / Shutdown Dialog to prevent phone turn-off during focus sessions.
 * 3. Intercepts PackageInstaller and Android Settings App Info pages to prevent app uninstallation during focus.
 */
class FocusAccessibilityService : AccessibilityService() {

    private val mainHandler = Handler(Looper.getMainLooper())
    private var lastToastTime = 0L

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val currentPackage = event.packageName?.toString() ?: return

        // 1. Check whether Focus Protection is active via shared preferences
        val prefs = applicationContext.getSharedPreferences("espark_focus_pref", Context.MODE_PRIVATE)
        val isFocusActive = prefs.getBoolean("isFocusActive", false)
        val focusEndTime = prefs.getLong("focusEndTime", 0L)

        // If inactive or timer naturally expired, do nothing
        if (!isFocusActive || System.currentTimeMillis() >= focusEndTime) {
            return
        }

        val ownPackage = applicationContext.packageName

        // 2. INTERCEPT POWER OFF / RESTART / SHUTDOWN MENU
        if (isPowerMenuEvent(event, currentPackage)) {
            blockPowerOffAttempt(ownPackage)
            return
        }

        // 3. INTERCEPT UNINSTALL ATTEMPTS (PackageInstaller & Settings App Info)
        if (isUninstallAttemptEvent(event, currentPackage, ownPackage)) {
            blockUninstallAttempt(ownPackage)
            return
        }

        // 4. Safe packages: ESpark itself
        if (currentPackage == ownPackage) {
            return
        }

        // Allow pure system notifications / volume panel without power menu
        if (currentPackage == "com.android.systemui" && !isPowerMenuEvent(event, currentPackage)) {
            return
        }

        // Allow Android Settings strictly if NOT on uninstall / force stop / device admin page
        if (currentPackage == "com.android.settings" && !isSettingsTamperEvent(event, ownPackage)) {
            return
        }

        // Allow Default Home Launcher
        try {
            val homeIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
            val resolveInfo = packageManager.resolveActivity(homeIntent, PackageManager.MATCH_DEFAULT_ONLY)
            val homePackage = resolveInfo?.activityInfo?.packageName
            if (currentPackage == homePackage) {
                return
            }
        } catch (e: Exception) {}

        // Allow Emergency Calls & Phone dialer
        if (currentPackage.startsWith("com.android.dialer") ||
            currentPackage.startsWith("com.google.android.dialer") ||
            currentPackage.contains("telecom") ||
            currentPackage.contains("emergency")
        ) {
            return
        }

        // 5. Inspect approved/allowed study packages
        val allowedPackages = prefs.getStringSet("allowedPackages", emptySet()) ?: emptySet()
        if (allowedPackages.contains(currentPackage)) {
            // Permitted study tool (e.g. Calculator, Notes, Spotify)
            return
        }

        // 6. Blocked distracting app detected! Redirect user back to ESpark Focus screen
        redirectToESpark(ownPackage, "blocked_package", currentPackage)
    }

    /**
     * Detects if the current accessibility event corresponds to the System Power Menu / Shutdown dialog
     */
    private fun isPowerMenuEvent(event: AccessibilityEvent, packageName: String): Boolean {
        if (packageName != "android" && packageName != "com.android.systemui") {
            return false
        }

        val className = event.className?.toString() ?: ""
        if (className.contains("GlobalActions", ignoreCase = true) ||
            className.contains("ShutdownActivity", ignoreCase = true) ||
            className.contains("PowerDialog", ignoreCase = true)
        ) {
            return true
        }

        // Inspect window texts for power off / restart keywords
        val rootNode = rootInActiveWindow
        if (rootNode != null) {
            val texts = mutableListOf<String>()
            extractNodeTexts(rootNode, texts)
            val joined = texts.joinToString(" ").lowercase()
            if (joined.contains("power off") ||
                joined.contains("shut down") ||
                joined.contains("restart") ||
                joined.contains("reboot") ||
                joined.contains("emergency mode")
            ) {
                return true
            }
        }
        return false
    }

    /**
     * Intercepts and dismisses the power off dialog
     */
    private fun blockPowerOffAttempt(ownPackage: String) {
        // Dismiss the system power dialog immediately
        try {
            sendBroadcast(Intent(Intent.ACTION_CLOSE_SYSTEM_DIALOGS))
        } catch (e: Exception) {}
        performGlobalAction(GLOBAL_ACTION_BACK)

        showToast("🔒 Focus Active: Device power off and restart are blocked to preserve your study session!")
        redirectToESpark(ownPackage, "power_attempt_blocked", "true")
    }

    /**
     * Detects if the user is attempting to uninstall ESpark
     */
    private fun isUninstallAttemptEvent(event: AccessibilityEvent, packageName: String, ownPackage: String): Boolean {
        // Direct Package Installer invocation (e.g. dragging icon to Uninstall or uninstall intent)
        if (packageName.contains("packageinstaller", ignoreCase = true)) {
            return true
        }

        // Settings app inspection
        if (packageName == "com.android.settings") {
            return isSettingsTamperEvent(event, ownPackage)
        }

        return false
    }

    /**
     * Checks if Android Settings is currently displaying ESpark's App Info, Uninstall, or Device Admin page
     */
    private fun isSettingsTamperEvent(event: AccessibilityEvent, ownPackage: String): Boolean {
        val rootNode = rootInActiveWindow ?: return false
        val texts = mutableListOf<String>()
        extractNodeTexts(rootNode, texts)
        val joined = texts.joinToString(" ").lowercase()

        // If settings mentions ESpark or its package name and dangerous actions like Uninstall, Force Stop, or Device Admin
        val isTargetingESpark = joined.contains("espark") || joined.contains(ownPackage.lowercase())
        val isTamperAction = joined.contains("uninstall") ||
                joined.contains("force stop") ||
                joined.contains("deactivate") ||
                joined.contains("device admin") ||
                joined.contains("clear data")

        return isTargetingESpark && isTamperAction
    }

    /**
     * Intercepts and dismisses the uninstall attempt
     */
    private fun blockUninstallAttempt(ownPackage: String) {
        try {
            sendBroadcast(Intent(Intent.ACTION_CLOSE_SYSTEM_DIALOGS))
        } catch (e: Exception) {}
        performGlobalAction(GLOBAL_ACTION_BACK)
        performGlobalAction(GLOBAL_ACTION_HOME)

        showToast("🔒 Focus Active: App uninstallation is locked during active focus sessions!")
        redirectToESpark(ownPackage, "uninstall_attempt_blocked", "true")
    }

    private fun redirectToESpark(ownPackage: String, extraKey: String, extraVal: String) {
        try {
            val launchIntent = packageManager.getLaunchIntentForPackage(ownPackage)?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                putExtra(extraKey, extraVal)
                putExtra("focus_breach", true)
            }
            if (launchIntent != null) {
                startActivity(launchIntent)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun extractNodeTexts(node: AccessibilityNodeInfo?, list: MutableList<String>) {
        if (node == null) return
        node.text?.let { list.add(it.toString()) }
        node.contentDescription?.let { list.add(it.toString()) }
        for (i in 0 until node.childCount) {
            extractNodeTexts(node.getChild(i), list)
        }
    }

    private fun showToast(msg: String) {
        val now = System.currentTimeMillis()
        if (now - lastToastTime > 3000) {
            lastToastTime = now
            mainHandler.post {
                Toast.makeText(applicationContext, msg, Toast.LENGTH_LONG).show()
            }
        }
    }

    override fun onInterrupt() {}
}
