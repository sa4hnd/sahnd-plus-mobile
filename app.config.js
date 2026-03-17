const IS_TV = process.env.EXPO_TV === '1';

const config = {
  expo: {
    name: "SAHND+",
    slug: "sahnd-plus",
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
      ...(IS_TV ? { banner: "./assets/tv-banner.png" } : {})
    },
    web: {
      bundler: "metro",
      output: "static"
    },
    updates: {
      url: "https://u.expo.dev/4c27db84-3dfc-4f7e-ace3-3bb95239718d"
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
        projectId: "4c27db84-3dfc-4f7e-ace3-3bb95239718d"
      }
    },
    owner: "dihmax"
  }
};

module.exports = config;
