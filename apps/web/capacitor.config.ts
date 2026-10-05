import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dev.yearbook.mobile',
  appName: 'Anamnou',
  webDir: 'dist-native',
  backgroundColor: '#fbf6f0',
  zoomEnabled: true,
  loggingBehavior: 'debug',
  ios: { contentInset: 'automatic' },
  plugins: {
    SystemBars: { insetsHandling: 'native', style: 'DARK' },
  },
};

export default config;
