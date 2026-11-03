import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { subscribeToMyReports } from '@/lib/services/reports';
import type { CampusReport } from '@/types/models';

function formatDate(timestamp: any): string {
  if (!timestamp?.toDate) return 'Date unavailable';

  return timestamp.toDate().toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function MyReportsScreen() {
  const [reports, setReports] = useState<CampusReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);

    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = subscribeToMyReports(
        (updatedReports) => {
          setReports(updatedReports);
          setLoading(false);
          setError(null);
        },
        (subscriptionError) => {
          setError(subscriptionError.message);
          setLoading(false);
        }
      );
    } catch (subscriptionError) {
      setError(
        subscriptionError instanceof Error
          ? subscriptionError.message
          : 'Unable to load your reports.'
      );
      setLoading(false);
    }

    return () => {
      unsubscribe?.();
    };
  }, [retryKey]);

  const handleRefresh = () => {
    setRetryKey((current) => current + 1);
  };

  const renderReport = ({ item }: { item: CampusReport }) => (
    <Pressable
      style={styles.reportCard}
      onPress={() =>
        router.push({
          pathname: '/report/[id]',
          params: { id: item.id },
        })
      }
    >
      <View style={styles.cardHeader}>
        <Text style={styles.category}>
          {formatLabel(item.category)}
        </Text>

        <Text
          style={[
            styles.status,
            item.status === 'resolved' && styles.resolvedStatus,
            item.status === 'rejected' && styles.rejectedStatus,
          ]}
        >
          {formatLabel(item.status)}
        </Text>
      </View>

      <Text style={styles.reportTitle}>{item.title}</Text>

      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>

      <Text style={styles.date}>
        {formatDate(item.createdAt)}
      </Text>

      <Text style={styles.viewDetails}>View details →</Text>
    </Pressable>
  );

  if (loading && reports.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.helperText}>Loading your reports...</Text>
      </View>
    );
  }

  if (error && reports.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn't load your reports</Text>
        <Text style={styles.helperText}>{error}</Text>

        <Pressable style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>My Reports</Text>
        <Text style={styles.subtitle}>
          Track the campus issues you've reported.
        </Text>
      </View>

      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={renderReport}
        contentContainerStyle={
          reports.length === 0 ? styles.emptyList : styles.list
        }
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>No reports yet</Text>
            <Text style={styles.helperText}>
              Reports you create will appear here.
            </Text>

            <Pressable
              style={styles.createButton}
              onPress={() => router.push('/create-report')}
            >
              <Text style={styles.createButtonText}>
                Create a report
              </Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 6,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyList: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  category: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  resolvedStatus: {
    color: '#166534',
    backgroundColor: '#DCFCE7',
  },
  rejectedStatus: {
    color: '#991B1B',
    backgroundColor: '#FEE2E2',
  },
  reportTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 7,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: '#475569',
  },
  date: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 12,
  },
  viewDetails: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  helperText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#B91C1C',
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 8,
    marginTop: 18,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 18,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
