
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { auth } from '@/lib/firebase';
import {
  getPollById,
  getPollResults,
  hasUserVoted,
  submitVote,
} from '@/lib/services/polls';
import type {
  CampusPoll,
  PollOptionResult,
} from '@/types/models';

export default function PollDetailsScreen() {
  const { pollId } = useLocalSearchParams<{ pollId: string }>();

  const [poll, setPoll] = useState<CampusPoll | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Results state
  const [results, setResults] = useState<PollOptionResult[] | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [resultsRequested, setResultsRequested] = useState(false);

  // Used to refresh the poll lifecycle while this screen is open.
  const [now, setNow] = useState(Date.now());

  const loadPoll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setResults(null);
      setResultsError(null);
      setResultsRequested(false);

      if (!pollId) {
        throw new Error('Poll ID is missing.');
      }

      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error('Please log in to view this poll.');
      }

      const pollData = await getPollById(pollId);

      if (!pollData) {
        throw new Error('This poll could not be found.');
      }

      setPoll(pollData);

      const alreadyVoted = await hasUserVoted(
        pollId,
        currentUser.uid
      );

      setHasVoted(alreadyVoted);
    } catch (err) {
      console.error('Error loading poll:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load this poll.'
      );
    } finally {
      setLoading(false);
    }
  }, [pollId]);

  useEffect(() => {
    loadPoll();
  }, [loadPoll]);

  // Refresh time every 30 seconds so the screen recognises expiry.
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Fetch results only after the poll has expired.
  useEffect(() => {
    if (!poll || !pollId) {
      return;
    }

    const isExpired = now >= poll.endsAt.toMillis();

    const resultsAllowed =
      poll.status === 'published' || poll.status === 'closed';

    if (!isExpired || !resultsAllowed || resultsRequested) {
      return;
    }

    let cancelled = false;

    const fetchResults = async () => {
      try {
        setResultsRequested(true);
        setResultsLoading(true);
        setResultsError(null);

        const pollResults = await getPollResults(pollId);

        if (!cancelled) {
          setResults(pollResults);
        }
      } catch (err) {
        console.error('Error loading poll results:', err);

        if (!cancelled) {
          setResultsError(
            err instanceof Error
              ? err.message
              : 'Unable to load poll results.'
          );
        }
      } finally {
        if (!cancelled) {
          setResultsLoading(false);
        }
      }
    };

    fetchResults();

    return () => {
      cancelled = true;
    };
  }, [poll, pollId, now, resultsRequested]);

  const handleVote = async () => {
    if (!poll || !selectedOption || !pollId) {
      setError('Please select an option before submitting.');
      return;
    }

    const currentUser = auth.currentUser;

    if (!currentUser) {
      setError('Please log in before voting.');
      return;
    }

    const currentTime = Date.now();

    if (poll.status !== 'published') {
      setError('This poll is not accepting votes.');
      return;
    }

    if (currentTime < poll.startsAt.toMillis()) {
      setError('Voting has not started yet.');
      return;
    }

    if (currentTime >= poll.endsAt.toMillis()) {
      setError('Voting for this poll has ended.');
      setNow(currentTime);
      return;
    }

    if (hasVoted) {
      setError('You have already voted in this poll.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setMessage(null);

      await submitVote(
        pollId,
        currentUser.uid,
        selectedOption
      );

      setHasVoted(true);
      setSelectedOption(null);

      setMessage('Your vote has been submitted successfully!');
    } catch (err) {
      console.error('Error submitting vote:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to submit your vote. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetryResults = () => {
    setResultsRequested(false);
    setResultsError(null);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.infoText}>Loading poll...</Text>
      </View>
    );
  }

  if (error && !poll) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>

        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (!poll) {
    return null;
  }

  const startsAt = poll.startsAt.toMillis();
  const endsAt = poll.endsAt.toMillis();

  const isUpcoming = now < startsAt;
  const isExpired = now >= endsAt;

  const isOpen =
    poll.status === 'published' &&
    !isUpcoming &&
    !isExpired;

  const resultsAllowed =
    poll.status === 'published' || poll.status === 'closed';

  const showResults = isExpired && resultsAllowed;

  let statusText = 'Voting open';

  if (poll.status !== 'published' && poll.status !== 'closed') {
    statusText = 'Poll unavailable';
  } else if (isUpcoming) {
    statusText = 'Voting has not started';
  } else if (isExpired) {
    statusText = 'Voting has ended';
  }

  const totalVotes =
    results?.reduce((total, item) => total + item.count, 0) ?? 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Pressable
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Text style={styles.backText}>← Back to polls</Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.label}>CAMPUS POLL</Text>

        <Text style={styles.title}>{poll.title}</Text>

        <Text style={styles.description}>
          {poll.description}
        </Text>

        <View
          style={[
            styles.statusContainer,
            isExpired && styles.expiredStatus,
            isUpcoming && styles.upcomingStatus,
            !resultsAllowed && styles.unavailableStatus,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              isExpired && styles.expiredStatusText,
              isUpcoming && styles.upcomingStatusText,
              !resultsAllowed && styles.unavailableStatusText,
            ]}
          >
            {statusText}
          </Text>
        </View>

        <View style={styles.divider} />

        {showResults ? (
          <>
            <Text style={styles.sectionTitle}>
              Poll Results
            </Text>

            <Text style={styles.helperText}>
              Final results are available because voting has ended.
            </Text>

            {resultsLoading && (
              <View style={styles.resultsLoading}>
                <ActivityIndicator
                  size="small"
                  color="#2563EB"
                />
                <Text style={styles.infoText}>
                  Calculating results...
                </Text>
              </View>
            )}

            {resultsError && (
              <View style={styles.notice}>
                <Text style={styles.errorText}>
                  {resultsError}
                </Text>

                <Pressable
                  onPress={handleRetryResults}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryButtonText}>
                    Retry loading results
                  </Text>
                </Pressable>
              </View>
            )}

            {results && (
              <>
                <View style={styles.totalVotesContainer}>
                  <Text style={styles.totalVotesNumber}>
                    {totalVotes}
                  </Text>
                  <Text style={styles.totalVotesLabel}>
                    Total votes
                  </Text>
                </View>

                {poll.options.map((option) => {
                  const result = results.find(
                    (item) => item.optionId === option.id
                  );

                  const count = result?.count ?? 0;

                  const percentage =
                    totalVotes > 0
                      ? Math.round((count / totalVotes) * 100)
                      : 0;

                  return (
                    <View
                      key={option.id}
                      style={styles.resultItem}
                    >
                      <View style={styles.resultHeader}>
                        <Text style={styles.resultOptionText}>
                          {option.label}
                        </Text>

                        <Text style={styles.resultCountText}>
                          {count} ({percentage}%)
                        </Text>
                      </View>

                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${percentage}%` },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}

                {totalVotes === 0 && (
                  <View style={styles.notice}>
                    <Text style={styles.noticeText}>
                      No votes were submitted for this poll.
                    </Text>
                  </View>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              Select your answer
            </Text>

            <Text style={styles.helperText}>
              Choose one option. You can only vote once.
            </Text>

            {poll.options.map((option) => {
              const selected = selectedOption === option.id;

              return (
                <Pressable
                  key={option.id}
                  disabled={!isOpen || hasVoted || submitting}
                  onPress={() => {
                    setSelectedOption(option.id);
                    setError(null);
                  }}
                  style={[
                    styles.option,
                    selected && styles.selectedOption,
                    (!isOpen || hasVoted) && styles.disabledOption,
                  ]}
                >
                  <View
                    style={[
                      styles.radio,
                      selected && styles.selectedRadio,
                    ]}
                  >
                    {selected && (
                      <View style={styles.radioInner} />
                    )}
                  </View>

                  <Text
                    style={[
                      styles.optionText,
                      selected && styles.selectedOptionText,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}

            {hasVoted && (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>
                  You have already voted in this poll. Thank you for participating!
                </Text>
              </View>
            )}

            {isUpcoming && (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>
                  Voting will become available when the poll starts.
                </Text>
              </View>
            )}

            {isExpired && (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>
                  Voting has ended. Results are being prepared.
                </Text>
              </View>
            )}

            {!resultsAllowed && (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>
                  This poll is currently unavailable for voting.
                </Text>
              </View>
            )}

            {message && (
              <Text style={styles.successText}>
                {message}
              </Text>
            )}

            {error && (
              <Text style={styles.errorText}>
                {error}
              </Text>
            )}

            {isOpen && !hasVoted && (
              <Pressable
                onPress={handleVote}
                disabled={!selectedOption || submitting}
                style={[
                  styles.submitButton,
                  (!selectedOption || submitting) &&
                    styles.submitButtonDisabled,
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    Submit Vote
                  </Text>
                )}
              </Pressable>
            )}
          </>
        )}

        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>
            Starts: {poll.startsAt.toDate().toLocaleString()}
          </Text>

          <Text style={styles.dateText}>
            Ends: {poll.endsAt.toDate().toLocaleString()}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F7F8FA',
  },
  backButton: {
    marginBottom: 14,
    paddingVertical: 8,
  },
  backText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E6E9EF',
  },
  label: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  title: {
    color: '#172033',
    fontSize: 23,
    fontWeight: '700',
    marginBottom: 9,
  },
  description: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 22,
  },
  statusContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 15,
    marginTop: 16,
  },
  statusText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '700',
  },
  expiredStatus: {
    backgroundColor: '#F1F5F9',
  },
  expiredStatusText: {
    color: '#475569',
  },
  upcomingStatus: {
    backgroundColor: '#FEF3C7',
  },
  upcomingStatusText: {
    color: '#92400E',
  },
  unavailableStatus: {
    backgroundColor: '#FEE2E2',
  },
  unavailableStatusText: {
    color: '#991B1B',
  },
  divider: {
    height: 1,
    backgroundColor: '#E8EBF0',
    marginVertical: 20,
  },
  sectionTitle: {
    color: '#172033',
    fontSize: 17,
    fontWeight: '700',
  },
  helperText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 5,
    marginBottom: 15,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  selectedOption: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  disabledOption: {
    opacity: 0.7,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRadio: {
    borderColor: '#2563EB',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  optionText: {
    flex: 1,
    color: '#334155',
    fontSize: 14,
  },
  selectedOptionText: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  notice: {
    backgroundColor: '#EFF6FF',
    borderRadius: 9,
    padding: 12,
    marginTop: 12,
  },
  noticeText: {
    color: '#1E40AF',
    fontSize: 13,
    lineHeight: 19,
  },
  successText: {
    color: '#15803D',
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
  infoText: {
    color: '#64748B',
    marginTop: 10,
  },
  resultsLoading: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  totalVotesContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
    alignItems: 'center',
  },
  totalVotesNumber: {
    color: '#172033',
    fontSize: 25,
    fontWeight: '700',
  },
  totalVotesLabel: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 3,
  },
  resultItem: {
    marginBottom: 18,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultOptionText: {
    flex: 1,
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 10,
  },
  resultCountText: {
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 5,
  },
  retryButton: {
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  retryButtonText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '700',
  },
  dateContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E8EBF0',
    marginTop: 20,
    paddingTop: 14,
    gap: 6,
  },
  dateText: {
    color: '#94A3B8',
    fontSize: 11,
  },
});
