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
  throw new Error(`Missing Firebase environment variables: ${missingConfig.join(', ')}`);
}

const appAlreadyExisted = getApps().length > 0;
const app = appAlreadyExisted ? getApp() : initializeApp(firebaseConfig);
console.log('CHECK 1: Firebase app initialized, pre-existing:', appAlreadyExisted);

let auth: FirebaseAuth.Auth;

if (appAlreadyExisted) {
  auth = FirebaseAuth.getAuth(app);
  console.log('CHECK 2-4: Reusing existing Auth instance');
} else {
  console.log('CHECK 2: Starting Auth initialization');

  if (Platform.OS !== 'web') {
    const AsyncStorage =
      require('@react-native-async-storage/async-storage').default;

    const getReactNativePersistence = (
      FirebaseAuth as typeof FirebaseAuth & {
        getReactNativePersistence: (storage: typeof AsyncStorage) => AuthPersistence;
      }
    ).getReactNativePersistence;

    console.log('CHECK 2a: getReactNativePersistence type:', typeof getReactNativePersistence);

    const persistence = getReactNativePersistence(AsyncStorage);
    console.log('CHECK 3: Persistence created');

    auth = FirebaseAuth.initializeAuth(app, { persistence });
    console.log('CHECK 4: Auth initialized with RN persistence');

  } else {
    console.log('CHECK 3 (web): Using default auth');
    auth = FirebaseAuth.initializeAuth(app);
    console.log('CHECK 4 (web): Auth initialized');
  }
}

const db = getFirestore(app);
console.log('CHECK 5: Firestore initialized');

export { app, auth, db };
