import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tailoredshapes.herdle',
  appName: 'Herdle',
  webDir: 'www',
  ios: {
    contentInset: 'always',
    backgroundColor: '#6BAE88',
  },
};

export default config;
