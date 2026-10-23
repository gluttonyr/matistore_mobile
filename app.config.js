export default ({ config }) => ({
    ...config,
    name: "matistore",
    slug: "matistore",
    icon: "./assets/logo-ios.png",
    // Web build = single-page app (no server pre-render, which would load native modules on the server).
    web: { ...config.web, output: "single", favicon: "./assets/logo-ios.png" },


    android: {
      ...config.android,
      package: "com.urbain_diligence.matistore_mobile",
      versionCode: 3,
      permissions: [
        "android.permission.CALL_PHONE",
        "android.permission.READ_PHONE_STATE"
      ],
      softwareKeyboardLayoutMode: "resize",
      adaptiveIcon: {
        foregroundImage: "./assets/logo-ios.png",
        backgroundColor: "#000000"
      },
      "googleServicesFile": "./google-services.json"
    },

    ios: {
      ...config.ios,
      icon: "./assets/logo-ios.png",
      bundleIdentifier: "com.urbain-diligence.matistore-mobile",
      googleServicesFile: "./GoogleService-Info.plist",
      appleTeamId: "98Y4TRJU7W",
      usesAppleSignIn: true,
      config: {
        ...config.ios?.config,
        usesNonExemptEncryption: false
      },
      infoPlist: {
        ...config.ios?.infoPlist,
        // Requis (Android a son équivalent via le plugin withExternalAppQueries
        // ci-dessous) pour que Linking.canOpenURL détecte ces apps si installées.
        LSApplicationQueriesSchemes: ["xbet"]
      }
    },

    plugins: [
      "expo-router",
      "expo-asset",
      "expo-audio",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#FFFFFF",
          image: "./assets/logo.png",
          imageWidth: 180,
          dark: {
            backgroundColor: "#FFFFFF",
            image: "./assets/logo.png"
          }
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/matistore_push.png", // silhouette blanche sur fond transparent, PNG
          color: "#000000", // ta couleur primaryGreen, utilisée comme fond du badge
          // sounds: ["./assets/notification-sound.wav"], // optionnel
        }
      ],
      "expo-web-browser",
      "expo-secure-store",
      "expo-apple-authentication",

      "@react-native-google-signin/google-signin",
      [
        "./plugins/withExternalAppQueries",
        {
          schemes: ["xbet"],
          packages: ["org.xbet.client1"]
        }
      ],
      [
        "expo-media-library",
        {
          granularPermissions: []
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "L'application a besoin d'accéder à vos photos.",
          cameraPermission: "L'application a besoin d'accéder à votre caméra."
        }
      ],
    ],

    extra: {
      ...config.extra,
      // API_URL lets a local test target another backend, e.g. API_URL=http://localhost:3000 npx expo start --web
      apiUrl: process.env.API_URL || "https://matistore.tech",
      // Client Web (type "Application Web" dans Google Cloud Console) : utilisé
      // uniquement sur la plateforme web (Platform.OS === 'web').
      googleWebClientId:
        "75018713485-93ukdgcl61t6hglt00f2c8ck7h8iiifo.apps.googleusercontent.com",
      // Client Android (type "Android", lié au package + SHA-1 du keystore) :
      // pas référencé directement en JS — Google Play Services le retrouve tout
      // seul via le package + SHA-1 enregistrés côté Google Cloud Console.
      // Gardé ici pour documentation/référence.
      googleAndroidClientId:
        "75018713485-sifqq6legg6127vhuendp3a4lf8ot9bf.apps.googleusercontent.com",
      eas: {
        projectId: "79f54627-7516-406b-b03f-af2718d5b85b"
      }

    }
});
