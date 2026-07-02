import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aldwycheuropeancapital.app',
  appName: 'Aldwych European Capital',
  webDir: 'public',
  server: {
    url: 'https://www.aldwycheuropeancapital.com',
    cleartext: false
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0f172a'
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0f172a'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
      showSpinner: false
    }
  }
};

export default config;