
import { router } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { auth } from '@/lib/firebase';
import { createPoll } from '@/lib/services/polls';

const DURATIONS = [1, 3, 5, 7];

export default function CreatePollScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [duration, setDuration] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const addOption = () => {
    if (options.length >= 6) return;
    setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;

    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    setOptions(
      options.map((option, i) => (i === index ? value : option))
    );
  };

  const handleCreatePoll = async () => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert('Authentication required', 'Please log in again.');
      return;
    }

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanOptions = options.map((option) => option.trim());

    if (!cleanTitle || !cleanDescription) {
      Alert.alert('Missing details', 'Enter a title and description.');
      return;
    }

    if (cleanTitle.length > 150 || cleanDescription.length > 1000) {
      Alert.alert('Too much text', 'Please shorten the title or description.');
      return;
    }

    if (
      cleanOptions.some((option) => !option) ||
      new Set(cleanOptions.map((option) => option.toLowerCase())).size !==
        cleanOptions.length
    ) {
      Alert.alert(
        'Invalid options',
        'Every option must have text and options must be unique.'
      );
      return;
    }

    try {
      setSubmitting(true);

      const now = Date.now();

      // Start voting one minute after creation to avoid clock/rule timing issues.
      const startsAt = Timestamp.fromDate(
        new Date(now + 60 * 1000)
      );

      const endsAt = Timestamp.fromDate(
        new Date(now + duration * 24 * 60 * 60 * 1000)
      );

      const pollOptions = cleanOptions.map((label, index) => ({
        id: `option-${index + 1}`,
        label,
      }));

      await createPoll({
        title: cleanTitle,
        description: cleanDescription,
        options: pollOptions,
        optionIds: pollOptions.map((option) => option.id),
        createdBy: user.uid,
        status: 'published',
        startsAt,
        endsAt,
      });

      Alert.alert(
        'Poll created',
        'Your campus poll has been published successfully.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Poll creation error:', error);

      Alert.alert(
        'Unable to create poll',
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setSubmitting(false);
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
        <Text style={styles.heading}>Create a Poll</Text>
        <Text style={styles.subtitle}>
          Ask a question and let your campus community vote.
        </Text>

        <Text style={styles.label}>Poll title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Which event should we organize?"
          placeholderTextColor="#94A3B8"
          value={title}
          onChangeText={setTitle}
          maxLength={150}
        />

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Add some context to your poll..."
          placeholderTextColor="#94A3B8"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={1000}
          textAlignVertical="top"
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.label}>Voting options *</Text>
          <Text style={styles.counter}>
            {options.length}/6
          </Text>
        </View>

        {options.map((option, index) => (
          <View key={index} style={styles.optionRow}>
            <TextInput
              style={[styles.input, styles.optionInput]}
              placeholder={`Option ${index + 1}`}
              placeholderTextColor="#94A3B8"
              value={option}
              onChangeText={(value) => updateOption(index, value)}
              maxLength={100}
            />

            {options.length > 2 && (
              <Pressable
                style={styles.removeButton}
                onPress={() => removeOption(index)}
              >
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            )}
          </View>
        ))}

        {options.length < 6 && (
          <Pressable style={styles.addButton} onPress={addOption}>
            <Text style={styles.addButtonText}>+ Add another option</Text>
          </Pressable>
        )}

        <Text style={styles.label}>Voting duration *</Text>
        <Text style={styles.durationHint}>
          The poll starts approximately one minute after creation.
        </Text>

        <View style={styles.durationRow}>
          {DURATIONS.map((days) => (
            <Pressable
              key={days}
              style={[
                styles.durationButton,
                duration === days && styles.selectedDuration,
              ]}
              onPress={() => setDuration(days)}
            >
              <Text
                style={[
                  styles.durationText,
                  duration === days && styles.selectedDurationText,
                ]}
              >
                {days} {days === 1 ? 'day' : 'days'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[
            styles.submitButton,
            submitting && styles.disabledButton,
          ]}
          onPress={handleCreatePoll}
          disabled={submitting}
        >
          <Text style={styles.submitText}>
            {submitting ? 'Publishing...' : 'Publish Poll'}
          </Text>
        </Pressable>

        <Text style={styles.footerNote}>
          Once published, students can participate during the voting period.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 25,
    fontWeight: '700',
    color: '#172033',
  },
  subtitle: {
    color: '#687386',
    fontSize: 14,
    marginTop: 7,
    marginBottom: 25,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 9,
    marginTop: 17,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 13,
    fontSize: 14,
    color: '#172033',
  },
  textArea: {
    height: 105,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counter: {
    color: '#64748B',
    fontSize: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 9,
  },
  optionInput: {
    flex: 1,
  },
  removeButton: {
    padding: 8,
  },
  removeText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: {
    alignSelf: 'flex-start',
    paddingVertical: 9,
  },
  addButtonText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 13,
  },
  durationHint: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 9,
  },
  durationButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 9,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedDuration: {
    backgroundColor: '#DBEAFE',
    borderColor: '#2563EB',
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  selectedDurationText: {
    color: '#1D4ED8',
  },
  submitButton: {
    marginTop: 30,
    backgroundColor: '#2563EB',
    borderRadius: 11,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 13,
    lineHeight: 17,
  },
});
