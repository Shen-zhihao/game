import { ExpoConfig } from 'expo/config';
import brand from './src/content/brand/brand.json';

const APP_NAME = brand.name;

const config: ExpoConfig = {
  name: APP_NAME,
  slug: 'stargrove-expedition',
  version: '0.1.0',
  icon: './assets/icon.png',
  orientation: 'landscape',
  userInterfaceStyle: 'dark',
  scheme: 'stargrove',
  ios: {
    bundleIdentifier: 'com.stargrove.expedition',
    buildNumber: '1',
    supportsTablet: true,
    infoPlist: {
      NSLocalNetworkUsageDescription: '在同一个 Wi-Fi 下发现手机并直接传递游戏存档。',
      NSBonjourServices: ['_stargrovesave._tcp'],
    },
  },
  android: {
    package: 'com.stargrove.expedition',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/brand/adaptive-icon.png',
      backgroundColor: '#087dc1',
    },
    permissions: [
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.ACCESS_WIFI_STATE',
      'android.permission.CHANGE_WIFI_MULTICAST_STATE',
    ],
    blockedPermissions: ['android.permission.RECORD_AUDIO'],
  },
  plugins: [
    'expo-sqlite',
    [
      'expo-camera',
      {
        cameraPermission: '扫描另一部手机的传档配对码。',
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          buildArchs: ['arm64-v8a'],
          targetSdkVersion: 36,
          compileSdkVersion: 36,
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
        },
        ios: { deploymentTarget: '16.4', enableSceneSupport: true },
      },
    ],
  ],
  web: { bundler: 'metro', name: `${APP_NAME} · 捕捉与进化冒险`, favicon: './assets/icon.png' },
};
export default config;
