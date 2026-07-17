export default {
  expo: {
    name: "matistore_mobile",
    slug: "matistore_mobile",
    icon: "./assets/matistore.png",

    android: {
      package: "com.koufessi_roland.matistore_mobile",
      adaptiveIcon: {
        foregroundImage: "./assets/matistore.png",
        backgroundColor: "#208AEF"
      }
    },

    ios: {
      infoPlist: {
        // Requis (Android a son équivalent via le plugin withExternalAppQueries
        // ci-dessous) pour que Linking.canOpenURL détecte ces apps si installées.
        LSApplicationQueriesSchemes: ["xbet"]
      }
    },

    plugins: [
      "expo-router",
      "expo-audio",
      
      "expo-web-browser",
      "expo-secure-store",
      "expo-notifications",
      "@react-native-google-signin/google-signin",
      [
        "./plugins/withExternalAppQueries",
        {
          schemes: ["xbet"],
          packages: ["org.xbet.client1"]
        }
      ]
    ],

    extra: {
      apiUrl: "http://10.0.2.2:3000",
      // Client Web (type "Application Web" dans Google Cloud Console) : utilisé
      // uniquement sur la plateforme web (Platform.OS === 'web').
      googleWebClientId:
        "75018713485-l9cpmuj4j4lh8k511v4mlngagk4oho4j.apps.googleusercontent.com",
      // Client Android (type "Android", lié au package + SHA-1 du keystore) :
      // pas référencé directement en JS — Google Play Services le retrouve tout
      // seul via le package + SHA-1 enregistrés côté Google Cloud Console.
      // Gardé ici pour documentation/référence.
      googleAndroidClientId:
        "75018713485-627an8p1kbt90e0gfdsv9671969snmpm.apps.googleusercontent.com",
      eas: {
        projectId: "56311e74-b854-4d2d-b1e0-e6df829423ec"
      }
    }
  }
};