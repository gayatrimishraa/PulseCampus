import { useFonts } from 'expo-font';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRouter,
  useSegments,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';

import { doc, getDoc } from 'firebase/firestore';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;

    let cancelled = false;

    const checkNavigation = async () => {
      const inAuthGroup = segments[0] === '(auth)';
      const currentAuthScreen = segments[1];

      if (!user) {
        if (!inAuthGroup) {
          router.replace('/(auth)/login');
        }
        return;
      }

      try {
        const profileRef = doc(db, 'users', user.uid);
        const profileSnapshot = await getDoc(profileRef);

        if (cancelled) return;

        if (profileSnapshot.exists()) {
          if (inAuthGroup) {
            router.replace('/(tabs)');
          }
        } else if (!inAuthGroup || currentAuthScreen !== 'register') {
          router.replace('/(auth)/register');
        }
      } catch (navigationError) {
        console.error('Profile navigation check failed:', navigationError);

        if (!cancelled && !inAuthGroup) {
          router.replace('/(auth)/register');
        }
      }
    };

    checkNavigation();

    return () => {
      cancelled = true;
    };
  }, [user, initializing, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen
          name="(auth)"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal' }}
        />
      </Stack>
    </ThemeProvider>
  );
}