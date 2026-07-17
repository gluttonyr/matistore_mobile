const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Déclare les <queries> Android nécessaires pour que Linking.canOpenURL /
 * openURL détectent correctement une app externe installée (ex: 1xBet).
 * Depuis Android 11 (API 30), sans cette déclaration, canOpenURL renvoie
 * toujours `false` pour un schéma/package non déclaré, même si l'app est
 * bien installée (restriction de visibilité des paquets).
 *
 * @param {import('@expo/config-plugins').ExpoConfig} config
 * @param {{ schemes?: string[]; packages?: string[] }} options
 */
function withExternalAppQueries(config, { schemes = [], packages = [] } = {}) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (!manifest.queries) {
      manifest.queries = [];
    }
    const queries = manifest.queries[0] ?? {};

    const existingSchemes = new Set(
      (queries.intent ?? []).map((i) => i.data?.[0]?.$?.['android:scheme'])
    );
    const newIntents = schemes
      .filter((scheme) => !existingSchemes.has(scheme))
      .map((scheme) => ({
        action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
        data: [{ $: { 'android:scheme': scheme } }],
      }));

    const existingPackages = new Set(
      (queries.package ?? []).map((p) => p.$['android:name'])
    );
    const newPackages = packages
      .filter((pkg) => !existingPackages.has(pkg))
      .map((pkg) => ({ $: { 'android:name': pkg } }));

    queries.intent = [...(queries.intent ?? []), ...newIntents];
    queries.package = [...(queries.package ?? []), ...newPackages];
    manifest.queries[0] = queries;

    return config;
  });
}

module.exports = withExternalAppQueries;
