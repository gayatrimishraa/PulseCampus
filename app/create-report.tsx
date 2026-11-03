import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

import { getBuildings } from '@/lib/services/buildings';
import { createReport } from '@/lib/services/reports';
import type { CampusBuilding, ReportCategory } from '@/types/models';

const categories: {
  label: string;
  value: ReportCategory;
  emoji: string;
}[] = [
  { label: 'Maintenance', value: 'maintenance', emoji: '🔧' },
  { label: 'Cleanliness', value: 'cleanliness', emoji: '🧹' },
  { label: 'Safety', value: 'safety', emoji: '🛡️' },
  { label: 'Facilities', value: 'facilities', emoji: '🏢' },
  { label: 'Other', value: 'other', emoji: '📌' },
];

export default function CreateReportScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] =
    useState<ReportCategory>('maintenance');

  const [buildings, setBuildings] = useState<CampusBuilding[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] =
    useState<string | null>(null);
  const [loadingBuildings, setLoadingBuildings] = useState(true);
  const [buildingError, setBuildingError] = useState('');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadBuildings() {
      try {
        setLoadingBuildings(true);
        setBuildingError('');

        const result = await getBuildings();

        if (isMounted) {
          setBuildings(result);
        }
      } catch (error) {
        if (isMounted) {
          setBuildingError(
            error instanceof Error
              ? error.message
              : 'Unable to load campus locations.'
          );
        }
      } finally {
        if (isMounted) {
          setLoadingBuildings(false);
        }
      }
    }

    loadBuildings();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedBuilding = buildings.find(
    (building) => building.id === selectedBuildingId
  );

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert(
        'Missing information',
        'Please enter both a title and a description.'
      );
      return;
    }

    if (title.trim().length < 5) {
      Alert.alert(
        'Title too short',
        'Please enter a more descriptive title.'
      );
      return;
    }

    setSubmitting(true);

    try {
      await createReport({
        title: title.trim(),
        description: description.trim(),
        category,
        buildingId: selectedBuilding?.id ?? null,
        location: selectedBuilding
          ? {
              latitude: selectedBuilding.latitude,
              longitude: selectedBuilding.longitude,
            }
          : null,
        expiresAt: null,
      });

      Alert.alert(
        'Report submitted',
        'Your campus report has been created.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Something went wrong while submitting your report.';

      Alert.alert('Submission failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹  Back to feed</Text>
        </Pressable>

        <Text style={styles.heading}>Create a report</Text>

        <Text style={styles.subtitle}>
          Help make your campus better by reporting an issue.
        </Text>

        <View style={styles.section}>
          <Text style={styles.label}>Report title</Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. Broken lights in Block A"
            placeholderTextColor="#9299A5"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          <Text style={styles.helper}>
            {title.length}/100 characters
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>

          <TextInput
            style={[styles.input, styles.descriptionInput]}
            placeholder="Describe the issue and where you noticed it..."
            placeholderTextColor="#9299A5"
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            maxLength={1000}
          />

          <Text style={styles.helper}>
            {description.length}/1000 characters
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Select a category</Text>

          <View style={styles.categoryGrid}>
            {categories.map((item) => {
              const selected = category === item.value;

              return (
                <Pressable
                  key={item.value}
                  style={[
                    styles.categoryButton,
                    selected && styles.categoryButtonSelected,
                  ]}
                  onPress={() => setCategory(item.value)}
                >
                  <Text style={styles.categoryEmoji}>
                    {item.emoji}
                  </Text>

                  <Text
                    style={[
                      styles.categoryText,
                      selected && styles.categoryTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>
            Campus location
            <Text style={styles.optional}> (Optional)</Text>
          </Text>

          <Text style={styles.locationSubtitle}>
            Select the building where the issue occurred.
          </Text>

          {loadingBuildings ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#3457D5" />
              <Text style={styles.loadingText}>
                Loading campus locations...
              </Text>
            </View>
          ) : buildingError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Could not load campus locations.
              </Text>
              <Text style={styles.errorDetail}>
                {buildingError}
              </Text>
            </View>
          ) : buildings.length === 0 ? (
            <Text style={styles.emptyLocationText}>
              No campus locations have been added yet. You can still
              submit your report without selecting a building.
            </Text>
          ) : (
            <View style={styles.buildingList}>
              {buildings.map((building) => {
                const selected =
                  selectedBuildingId === building.id;

                return (
                  <Pressable
                    key={building.id}
                    style={[
                      styles.buildingButton,
                      selected && styles.buildingButtonSelected,
                    ]}
                    onPress={() =>
                      setSelectedBuildingId(
                        selected ? null : building.id
                      )
                    }
                  >
                    <View style={styles.buildingTextContainer}>
                      <Text
                        style={[
                          styles.buildingName,
                          selected && styles.buildingNameSelected,
                        ]}
                      >
                        {building.name}
                      </Text>

                      <Text style={styles.buildingDescription}>
                        {building.description}
                      </Text>
                    </View>

                    <Text style={styles.selectionIndicator}>
                      {selected ? '✓' : '○'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {selectedBuilding && (
            <Pressable
              onPress={() => setSelectedBuildingId(null)}
              style={styles.clearLocationButton}
            >
              <Text style={styles.clearLocationText}>
                Remove selected location
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.note}>
          <Text style={styles.noteTitle}>Before submitting</Text>

          <Text style={styles.noteText}>
            Please provide clear and accurate information. Your report
            will appear in the campus feed and can be viewed by other
            signed-in students.
          </Text>
        </View>

        <Pressable
          style={[
            styles.submitButton,
            submitting && styles.disabledButton,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>
              Submit report
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  container: {
    padding: 22,
    paddingTop: 55,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 25,
  },
  backText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#172033',
  },
  subtitle: {
    fontSize: 15,
    color: '#707A8A',
    marginTop: 8,
    marginBottom: 30,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#273247',
    marginBottom: 10,
  },
  optional: {
    color: '#9299A5',
    fontWeight: '400',
    fontSize: 13,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E5EB',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 15,
    color: '#172033',
  },
  descriptionInput: {
    minHeight: 140,
  },
  helper: {
    color: '#9299A5',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 6,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryButton: {
    width: '48%',
    minHeight: 58,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E5EB',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 9,
  },
  categoryButtonSelected: {
    borderColor: '#3457D5',
    backgroundColor: '#EEF2FF',
  },
  categoryEmoji: {
    fontSize: 19,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  categoryTextSelected: {
    color: '#3457D5',
  },
  locationSubtitle: {
    color: '#707A8A',
    fontSize: 13,
    marginTop: -3,
    marginBottom: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  loadingText: {
    color: '#707A8A',
    fontSize: 13,
  },
  buildingList: {
    gap: 10,
  },
  buildingButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E5EB',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  buildingButtonSelected: {
    borderColor: '#3457D5',
    backgroundColor: '#EEF2FF',
  },
  buildingTextContainer: {
    flex: 1,
  },
  buildingName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#273247',
  },
  buildingNameSelected: {
    color: '#3457D5',
  },
  buildingDescription: {
    color: '#707A8A',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  selectionIndicator: {
    fontSize: 20,
    color: '#3457D5',
    fontWeight: '700',
  },
  clearLocationButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  clearLocationText: {
    color: '#3457D5',
    fontWeight: '600',
    fontSize: 13,
  },
  errorContainer: {
    backgroundColor: '#FFF1F0',
    borderRadius: 12,
    padding: 14,
  },
  errorText: {
    color: '#B42318',
    fontWeight: '700',
    fontSize: 13,
  },
  errorDetail: {
    color: '#9C3D36',
    fontSize: 12,
    marginTop: 5,
  },
  emptyLocationText: {
    color: '#707A8A',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    fontSize: 13,
    lineHeight: 20,
  },
  note: {
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 25,
  },
  noteTitle: {
    color: '#263D91',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  noteText: {
    color: '#465A9B',
    fontSize: 13,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#3457D5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.65,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});