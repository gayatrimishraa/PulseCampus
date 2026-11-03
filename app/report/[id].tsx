
import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { updateReport } from '@/lib/services/reports';
import type {
    CampusReport,
    ReportCategory,
} from '@/types/models';

const categories: { label: string; value: ReportCategory }[] = [
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Cleanliness', value: 'cleanliness' },
  { label: 'Safety', value: 'safety' },
  { label: 'Facilities', value: 'facilities' },
  { label: 'Other', value: 'other' },
];

const statusLabels: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

function formatDate(timestamp: CampusReport['createdAt']) {
  if (!timestamp || typeof timestamp.toDate !== 'function') {
    return 'Date unavailable';
  }

  return timestamp.toDate().toLocaleString();
}

export default function ReportDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [report, setReport] = useState<CampusReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] =
    useState<ReportCategory>('maintenance');

  const loadReport = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const reportRef = doc(db, 'reports', id);
      const snapshot = await getDoc(reportRef);

      if (!snapshot.exists()) {
        setReport(null);
        return;
      }

      const data = {
        id: snapshot.id,
        ...snapshot.data(),
      } as CampusReport;

      setReport(data);
      setTitle(data.title);
      setDescription(data.description);
      setCategory(data.category);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'Unable to load this report.'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const isOwner = report?.createdBy === user?.uid;

  const handleSave = async () => {
    if (!report) return;

    if (!title.trim() || !description.trim()) {
      Alert.alert(
        'Missing information',
        'Title and description cannot be empty.'
      );
      return;
    }

    try {
      setSaving(true);

      await updateReport(report.id, {
        title: title.trim(),
        description: description.trim(),
        category,
        buildingId: report.buildingId,
        location: report.location,
      });

      setReport({
        ...report,
        title: title.trim(),
        description: description.trim(),
        category,
      });

      setEditing(false);
      Alert.alert('Updated', 'Your report has been updated.');
    } catch (error) {
      Alert.alert(
        'Update failed',
        error instanceof Error
          ? error.message
          : 'Unable to update this report.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3457D5" />
        <Text style={styles.loadingText}>Loading report...</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundTitle}>Report not found</Text>
        <Text style={styles.muted}>
          This report may have been deleted or is unavailable.
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Pressable
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backText}>‹  Back to feed</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.heading}>Report details</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {statusLabels[report.status] ?? report.status}
          </Text>
        </View>
      </View>

      {editing ? (
        <>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.descriptionInput]}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            maxLength={1000}
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryList}>
            {categories.map((item) => (
              <Pressable
                key={item.value}
                onPress={() => setCategory(item.value)}
                style={[
                  styles.categoryButton,
                  category === item.value &&
                    styles.categoryButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    category === item.value &&
                      styles.categoryTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.actionRow}>
            <Pressable
              style={styles.cancelButton}
              onPress={() => {
                setTitle(report.title);
                setDescription(report.description);
                setCategory(report.category);
                setEditing(false);
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[styles.primaryButton, saving && styles.disabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Save changes</Text>
              )}
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.categoryLabel}>
              {categories.find((item) => item.value === report.category)
                ?.label ?? report.category}
            </Text>

            <Text style={styles.title}>{report.title}</Text>
            <Text style={styles.description}>{report.description}</Text>

            <View style={styles.divider} />

            <Text style={styles.metaLabel}>Reported on</Text>
            <Text style={styles.metaValue}>
              {formatDate(report.createdAt)}
            </Text>

            <Text style={styles.metaLabel}>Status</Text>
            <Text style={styles.metaValue}>
              {statusLabels[report.status] ?? report.status}
            </Text>

            {report.buildingId ? (
              <>
                <Text style={styles.metaLabel}>Building</Text>
                <Text style={styles.metaValue}>{report.buildingId}</Text>
              </>
            ) : null}
          </View>

          {isOwner && (
            <Pressable
              style={styles.primaryButton}
              onPress={() => setEditing(true)}
            >
              <Text style={styles.primaryButtonText}>Edit my report</Text>
            </Pressable>
          )}
        </>
      )}
    </ScrollView>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
  },
  notFoundTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#172033',
    marginBottom: 8,
  },
  muted: {
    color: '#64748B',
    textAlign: 'center',
  },
  backButton: {
    marginBottom: 25,
    alignSelf: 'flex-start',
  },
  backText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
    gap: 10,
  },
  heading: {
    fontSize: 27,
    fontWeight: '800',
    color: '#172033',
  },
  statusBadge: {
    backgroundColor: '#E8EDFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  statusText: {
    color: '#3457D5',
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E7EAF0',
    marginBottom: 22,
  },
  categoryLabel: {
    color: '#3457D5',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#172033',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
  },
  divider: {
    height: 1,
    backgroundColor: '#E7EAF0',
    marginVertical: 20,
  },
  metaLabel: {
    color: '#9299A5',
    fontSize: 12,
    marginTop: 12,
    marginBottom: 4,
  },
  metaValue: {
    color: '#273247',
    fontSize: 14,
    fontWeight: '600',
  },
  label: {
    color: '#273247',
    fontWeight: '700',
    marginBottom: 9,
    marginTop: 18,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E5EB',
    borderRadius: 12,
    padding: 14,
    color: '#172033',
    fontSize: 15,
  },
  descriptionInput: {
    minHeight: 130,
  },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  categoryButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E1E5EB',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  categoryButtonSelected: {
    borderColor: '#3457D5',
    backgroundColor: '#EEF2FF',
  },
  categoryText: {
    color: '#475569',
    fontWeight: '600',
  },
  categoryTextSelected: {
    color: '#3457D5',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 25,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D5DAE2',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
  },
  cancelText: {
    color: '#475569',
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#3457D5',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  disabled: {
    opacity: 0.6,
  },
});
