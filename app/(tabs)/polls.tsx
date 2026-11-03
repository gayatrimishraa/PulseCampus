
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { getPublishedPolls } from '@/lib/services/polls';
import type { CampusPoll } from '@/types/models';

export default function PollsScreen() {
  const [polls, setPolls] = useState<CampusPoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPolls = useCallback(async () => {
    try {
      setError(null);

      const data = await getPublishedPolls();

      // Display polls with the newest creation date first.
      data.sort(
        (a, b) =>
          b.createdAt.toMillis() - a.createdAt.toMillis()
      );

      setPolls(data);
    } catch (err) {
      console.error('Error loading polls:', err);
      setError('Unable to load polls. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPolls();
  }, [loadPolls]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPolls();
  };

  const renderPoll = ({ item }: { item: CampusPoll }) => {
    const now = Date.now();
    const startsAt = item.startsAt.toMillis();
    const endsAt = item.endsAt.toMillis();

    let availability = 'Upcoming';

    if (now >= startsAt && now < endsAt) {
      availability = 'Voting open';
    } else if (now >= endsAt) {
      availability = 'Voting ended';
    }

    return (
      <View style={styles.pollCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.pollLabel}>CAMPUS POLL</Text>

          <Text
            style={[
              styles.status,
              availability === 'Voting open' && styles.openStatus,
              availability === 'Voting ended' && styles.closedStatus,
            ]}
          >
            {availability}
          </Text>
        </View>

        <Text style={styles.pollTitle}>{item.title}</Text>

        <Text style={styles.description}>
          {item.description}
        </Text>

        <View style={styles.divider} />

        <Text style={styles.optionsHeading}>
          {item.options.length} voting options
        </Text>

        {item.options.map((option) => (
          <View key={option.id} style={styles.option}>
            <Text style={styles.optionText}>
              {option.label}
            </Text>
          </View>
        ))}

        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>
            Starts: {item.startsAt.toDate().toLocaleString()}
          </Text>

          <Text style={styles.dateText}>
            Ends: {item.endsAt.toDate().toLocaleString()}
          </Text>
        </View>

        <Pressable
          style={styles.voteButton}
          onPress={() =>
            router.push({
              pathname: '/poll-details',
              params: { pollId: item.id },
            })
          }
        >
          <Text style={styles.voteButtonText}>
            View Poll & Vote →
          </Text>
        </Pressable>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.message}>Loading polls...</Text>
      </View>
    );
  }

  if (error && polls.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Text style={styles.retry} onPress={loadPolls}>
          Tap here to retry
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headingContainer}>
        <Text style={styles.heading}>Campus Polls</Text>
        <Text style={styles.subheading}>
          Share your opinion and participate in campus decisions.
        </Text>
      </View>

      <Pressable
        style={styles.createPollButton}
        onPress={() => router.push('/create-polls')}
      >
        <Text style={styles.createPollButtonText}>
          + Create a Poll
        </Text>
      </Pressable>

      {error && (
        <Text style={styles.error}>{error}</Text>
      )}

      <FlatList
        data={polls}
        keyExtractor={(item) => item.id}
        renderItem={renderPoll}
        contentContainerStyle={
          polls.length === 0 ? styles.emptyContainer : styles.list
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>
              No polls available
            </Text>
            <Text style={styles.message}>
              Published campus polls will appear here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  headingContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  heading: {
    fontSize: 25,
    fontWeight: '700',
    color: '#172033',
  },
  subheading: {
    fontSize: 14,
    color: '#687386',
    marginTop: 6,
    lineHeight: 21,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  pollCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 17,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E6E9EF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  pollLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1,
  },
  status: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B7791F',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  openStatus: {
    color: '#166534',
    backgroundColor: '#DCFCE7',
  },
  closedStatus: {
    color: '#64748B',
    backgroundColor: '#E2E8F0',
  },
  pollTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#172033',
    marginBottom: 7,
  },
  description: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 21,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8EBF0',
    marginVertical: 15,
  },
  optionsHeading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 10,
  },
  option: {
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 9,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    color: '#334155',
  },
  dateContainer: {
    marginTop: 8,
    gap: 5,
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  message: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 10,
    textAlign: 'center',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#334155',
  },
  error: {
    color: '#DC2626',
    textAlign: 'center',
    padding: 12,
  },
  retry: {
    color: '#2563EB',
    marginTop: 12,
    fontWeight: '600',
  },
  createPollButton: {
    backgroundColor: '#2563EB',
    marginHorizontal: 16,
    marginBottom: 14,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  createPollButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  voteButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 13,
    borderRadius: 9,
    alignItems: 'center',
    marginTop: 15,
  },
  voteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
