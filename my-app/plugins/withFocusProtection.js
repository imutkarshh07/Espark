const {
  withAndroidManifest,
  withStringsXml,
  withDangerousMod,
  withMainApplication,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * withFocusProtection
 * Expo Config Plugin that injects ESpark's native Android AccessibilityService,
 * package visibility queries, accessibility XML configuration, and the
 * FocusProtection native module package into Android development & production builds.
 */
function withFocusProtection(config) {
  // 1. Configure AndroidManifest.xml: package visibility queries and AccessibilityService declaration
  config = withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;

    // A. Package visibility <queries> for launcher apps (Android 11+ / API 30+)
    if (!manifest.queries || manifest.queries.length === 0) {
      manifest.queries = [{ intent: [] }];
    }
    const firstQueries = manifest.queries[0];
    if (!firstQueries.intent) {
      firstQueries.intent = [];
    }
    const hasLauncherQuery = manifest.queries.some(
      (q) =>
        q.intent &&
        q.intent.some(
          (i) =>
            i.action &&
            i.action.some(
              (a) => a.$?.['android:name'] === 'android.intent.action.MAIN'
            )
        )
    );

    if (!hasLauncherQuery) {
      firstQueries.intent.push({
        action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
        category: [
          { $: { 'android:name': 'android.intent.category.LAUNCHER' } },
        ],
      });
    }

    // B. Enable cleartext HTTP traffic for local development / LAN backend connections
    const app = manifest.application?.[0];
    if (app) {
      if (!app.$) {
        app.$ = {};
      }
      app.$['android:usesCleartextTraffic'] = 'true';

      if (!app.service) {
        app.service = [];
      }

      const hasService = app.service.some(
        (s) =>
          s.$?.['android:name'] === '.focus.FocusAccessibilityService' ||
          s.$?.['android:name'] ===
            'com.espark.app.focus.FocusAccessibilityService'
      );

      if (!hasService) {
        app.service.push({
          $: {
            'android:name': '.focus.FocusAccessibilityService',
            'android:permission':
              'android.permission.BIND_ACCESSIBILITY_SERVICE',
            'android:exported': 'true',
          },
          'intent-filter': [
            {
              action: [
                {
                  $: {
                    'android:name':
                      'android.accessibilityservice.AccessibilityService',
                  },
                },
              ],
            },
          ],
          'meta-data': [
            {
              $: {
                'android:name': 'android.accessibilityservice',
                'android:resource': '@xml/focus_accessibility_service',
              },
            },
          ],
        });
      }

      // C. Register FocusDeviceAdminReceiver for OS-level uninstallation prevention
      if (!app.receiver) {
        app.receiver = [];
      }
      const hasAdminReceiver = app.receiver.some(
        (r) =>
          r.$?.['android:name'] === '.focus.FocusDeviceAdminReceiver' ||
          r.$?.['android:name'] === 'com.espark.app.focus.FocusDeviceAdminReceiver'
      );
      if (!hasAdminReceiver) {
        app.receiver.push({
          $: {
            'android:name': '.focus.FocusDeviceAdminReceiver',
            'android:permission': 'android.permission.BIND_DEVICE_ADMIN',
            'android:exported': 'true',
          },
          'intent-filter': [
            {
              action: [
                {
                  $: {
                    'android:name': 'android.app.action.DEVICE_ADMIN_ENABLED',
                  },
                },
              ],
            },
          ],
          'meta-data': [
            {
              $: {
                'android:name': 'android.app.device_admin',
                'android:resource': '@xml/device_admin_sample',
              },
            },
          ],
        });
      }
    }

    return modConfig;
  });

  // 2. Add Accessibility Strings in strings.xml
  config = withStringsXml(config, (modConfig) => {
    const strings = modConfig.modResults.resources.string || [];

    const addStringIfMissing = (name, value) => {
      const exists = strings.some((s) => s.$?.name === name);
      if (!exists) {
        strings.push({
          $: { name },
          _: value,
        });
      }
    };

    addStringIfMissing('focus_accessibility_service_label', 'ESpark Focus Protection');
    addStringIfMissing(
      'focus_accessibility_service_description',
      'Safeguards your study session by monitoring when distracting apps open during active Focus Mode in ESpark.'
    );

    modConfig.modResults.resources.string = strings;
    return modConfig;
  });

  // 3. Copy Native Files (XML config & Kotlin sources) into Android Project during prebuild
  config = withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const androidAppDir = path.join(projectRoot, 'android', 'app', 'src', 'main');

      // A. Copy XML configuration to res/xml/
      const resXmlDir = path.join(androidAppDir, 'res', 'xml');
      if (!fs.existsSync(resXmlDir)) {
        fs.mkdirSync(resXmlDir, { recursive: true });
      }

      const xmlSource = path.join(
        projectRoot,
        'plugins',
        'native',
        'focus_accessibility_service.xml'
      );
      const xmlDest = path.join(resXmlDir, 'focus_accessibility_service.xml');
      if (fs.existsSync(xmlSource)) {
        fs.copyFileSync(xmlSource, xmlDest);
      }

      const adminXmlSource = path.join(
        projectRoot,
        'plugins',
        'native',
        'device_admin_sample.xml'
      );
      const adminXmlDest = path.join(resXmlDir, 'device_admin_sample.xml');
      if (fs.existsSync(adminXmlSource)) {
        fs.copyFileSync(adminXmlSource, adminXmlDest);
      }

      // B. Copy Kotlin Native Sources to java/com/espark/app/focus/
      const targetJavaDir = path.join(
        androidAppDir,
        'java',
        'com',
        'espark',
        'app',
        'focus'
      );
      if (!fs.existsSync(targetJavaDir)) {
        fs.mkdirSync(targetJavaDir, { recursive: true });
      }

      const nativeSrcDir = path.join(projectRoot, 'plugins', 'native');
      const filesToCopy = [
        'FocusAccessibilityService.kt',
        'FocusDeviceAdminReceiver.kt',
        'FocusProtectionModule.kt',
        'FocusProtectionPackage.java',
      ];

      for (const fileName of filesToCopy) {
        const srcFile = path.join(nativeSrcDir, fileName);
        const destFile = path.join(targetJavaDir, fileName);
        if (fs.existsSync(srcFile)) {
          fs.copyFileSync(srcFile, destFile);
        }
      }

      return modConfig;
    },
  ]);

  // 4. Register FocusProtectionPackage in MainApplication
  config = withMainApplication(config, (modConfig) => {
    let contents = modConfig.modResults.contents;

    // Check if package import exists
    if (!contents.includes('com.espark.app.focus.FocusProtectionPackage')) {
      contents = contents.replace(
        /package com\.espark\.app/g,
        'package com.espark.app\nimport com.espark.app.focus.FocusProtectionPackage'
      );
    }

    // Add FocusProtectionPackage() to PackageList
    if (!contents.includes('FocusProtectionPackage()')) {
      if (contents.includes('PackageList(this).packages.apply {')) {
        contents = contents.replace(
          'PackageList(this).packages.apply {',
          'PackageList(this).packages.apply {\n            add(FocusProtectionPackage())'
        );
      } else if (contents.includes('PackageList(this).packages')) {
        contents = contents.replace(
          'PackageList(this).packages',
          'PackageList(this).packages.apply {\n            add(FocusProtectionPackage())\n        }'
        );
      }
    }

    modConfig.modResults.contents = contents;
    return modConfig;
  });

  return config;
}

module.exports = withFocusProtection;
