
import { getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

type AuthDependencies = NonNullable<
  Parameters<typeof FirebaseAuth.initializeAuth>[1]
>;
type AuthPersistence = NonNullable<AuthDependencies['persistence']>;

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const missingConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingConfig.length > 0) {
  throw new Error(
    `Missing Firebase environment variables: ${missingConfig.join(', ')}`
  );
}

const appAlreadyExisted = getApps().length > 0;
const app = appAlreadyExisted ? getApp() : initializeApp(firebaseConfig);

let auth: FirebaseAuth.Auth;

if (Platform.OS === 'web') {
  auth = FirebaseAuth.getAuth(app);
} else if (appAlreadyExisted) {
  auth = FirebaseAuth.getAuth(app);
} else {
  const getReactNativePersistence = (
    FirebaseAuth as typeof FirebaseAuth & {
      getReactNativePersistence: (
        storage: AuthPersistence
      ) => AuthDependencies['persistence'];
    }
  ).getReactNativePersistence;

  const AsyncStorage =
    require('@react-native-async-storage/async-storage').default;

  auth = FirebaseAuth.initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

const db = getFirestore(app);

export { app, auth, db };
