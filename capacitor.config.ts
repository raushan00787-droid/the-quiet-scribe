import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.raushan.quietscribe',
  appName: 'Quiet Scribe',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  }
};

export default config;
