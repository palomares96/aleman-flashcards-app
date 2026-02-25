import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aleman.flashcards',
  appName: 'Aleman App',
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"],
    },
    CapacitorUpdater: {
      autoUpdate: true,
      statsUrl: "https://api.capgo.app (https://api.capgo.app/)",
    },
  },
};

export default config;
