const IS_TV = process.env.EXPO_TV === '1';

const config = {
  expo: {
    name: "SAHND+",
    slug: "sahndplus",
    version: "1.0.0",
    orientation: "default",
    icon: "./assets/icon.png",
    scheme: "sahndplus",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/logo.png",
      resizeMode: "contain",
      backgroundColor: "#0a0a0a"
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.sahnd.plus",
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true
        },
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0a0a0a"
      },
      package: "com.sahnd.plus",
      permissions: [],
      usesCleartextTraffic: true,
      ...(IS_TV ? { banner: "./assets/tv-banner.png" } : {})
    },
    web: {
      bundler: "metro",
      output: "static"
    },
    updates: {
      url: "https://u.expo.dev/e6d4c668-2809-493d-a86c-e156a7a200bc"
    },
    runtimeVersion: {
      policy: "appVersion"
    },
    plugins: [
      "expo-router",
      "expo-video",
      "react-native-video",
      ...(IS_TV ? [["@react-native-tvos/config-tv", { isTV: true }]] : [])
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {},
      eas: {
        projectId: "e6d4c668-2809-493d-a86c-e156a7a200bc"
      }
    },
    owner: "sahndmint"
  }
};

module.exports = config;
