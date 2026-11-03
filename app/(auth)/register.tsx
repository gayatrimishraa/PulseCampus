import { Link, router } from 'expo-router';
import { useState } from 'react';

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (
      !fullName.trim() ||
      !studentId.trim() ||
      !normalizedEmail ||
      !password ||
      !confirmPassword
    ) {
      setError('Please fill in all fields.');
      return;
    }

    if (!normalizedEmail.endsWith('@nexusuniversity.edu')) {
      setError('Please use your Nexus University demo email.');
      return;
    }

    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      let user = auth.currentUser;

      // Reuse the current account if it belongs to this email.
      if (user?.email?.toLowerCase() !== normalizedEmail) {
        try {
          const credential = await createUserWithEmailAndPassword(
            auth,
            normalizedEmail,
            password
          );

          user = credential.user;
        } catch (createError: any) {
          // Recover an existing Firebase Authentication account.
          if (createError.code === 'auth/email-already-in-use') {
            const credential = await signInWithEmailAndPassword(
              auth,
              normalizedEmail,
              password
            );

            user = credential.user;
          } else {
            throw createError;
          }
        }
      }

      if (!user) {
        throw new Error('Unable to retrieve your Firebase account.');
      }

      // Check whether this account already has a profile.
      const profileRef = doc(db, 'users', user.uid);
      const profileSnapshot = await getDoc(profileRef);

      if (profileSnapshot.exists()) {
        // Do not overwrite an existing profile.
        router.replace('/(tabs)');
        return;
      }

      // Create the missing student profile.
      await setDoc(profileRef, {
        uid: user.uid,
        fullName: fullName.trim(),
        email: normalizedEmail,
        studentId: studentId.trim(),
        role: 'student',
        authProvider: 'password',
        createdAt: serverTimestamp(),
      });

      console.log('Firestore student profile created:', user.uid);

      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Registration/profile creation error:', err);

      if (err.code === 'auth/email-already-in-use') {
        setError(
          'This email already has an account. Enter its existing password to recover the profile.'
        );
      } else if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password'
      ) {
        setError('Incorrect password for this existing account.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/weak-password') {
        setError('Please choose a stronger password.');
      } else if (
        err.code === 'permission-denied' ||
        err.code === 'firestore/permission-denied'
      ) {
        setError(
          'Firestore denied profile creation. Check that your security rules have been published.'
        );
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>PulseCampus</Text>

        <Text style={styles.heading}>Create Account</Text>

        <Text style={styles.subtitle}>
          Join your Nexus University campus community
        </Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Student ID</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your student ID"
          value={studentId}
          onChangeText={setStudentId}
          autoCapitalize="characters"
        />

        <Text style={styles.label}>University Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@nexusuniversity.edu"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Minimum 6 characters"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, loading && styles.disabledButton]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </Pressable>

        <Text style={styles.footer}>
          Already have an account?{' '}
          <Link href="/login" style={styles.link}>
            Sign In
          </Link>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  brand: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#3659D9',
    marginBottom: 25,
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#171A2B',
  },
  subtitle: {
    fontSize: 14,
    color: '#777',
    marginTop: 8,
    marginBottom: 28,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 7,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E3ED',
    borderRadius: 10,
    padding: 14,
    marginBottom: 17,
    fontSize: 15,
    color: '#171A2B',
  },
  button: {
    backgroundColor: '#3659D9',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 5,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  error: {
    color: '#D32F2F',
    marginBottom: 12,
  },
  footer: {
    textAlign: 'center',
    marginTop: 25,
    color: '#666',
  },
  link: {
    color: '#3659D9',
    fontWeight: 'bold',
  },
});