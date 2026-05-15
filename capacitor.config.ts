import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zentribank.app',
  appName: 'ZentriBank',
  webDir: 'public',
  server: {
    url: 'https://www.zentribank.capital',
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