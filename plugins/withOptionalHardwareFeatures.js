const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Marks hardware features as optional (android:required="false").
 * Without this, CALL_PHONE / READ_PHONE_STATE imply "android.hardware.telephony"
 * and the portrait lock implies "android.hardware.screen.portrait": Google Play
 * then hides the app from tablets, Chromebooks and other devices without them.
 * The USSD payment still works on phones; elsewhere the user dials the code by hand.
 *
 * @param {import('@expo/config-plugins').ExpoConfig} config
 * @param {{ features?: string[] }} options
 */
function withOptionalHardwareFeatures(config, { features = [] } = {}) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const list = manifest['uses-feature'] ?? [];
    for (const name of features) {
      const existing = list.find((f) => f.$?.['android:name'] === name);
      if (existing) existing.$['android:required'] = 'false';
      else list.push({ $: { 'android:name': name, 'android:required': 'false' } });
    }
    manifest['uses-feature'] = list;
    return config;
  });
}

module.exports = withOptionalHardwareFeatures;
