
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';

import { subscribeToReports } from '@/lib/services/reports';

import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/lib/services/notifications';

import type {
  CampusNotification,
  CampusReport,
} from '@/types/models';

// Report categories
const categories = [
  'all',
  'maintenance',
  'cleanliness',
  'safety',
  'facilities',
  'other',
] as const;

const categoryLabels: Record<string, string> = {
  all: 'All',
  maintenance: 'Maintenance',
  cleanliness: 'Cleanliness',
  safety: 'Safety',
  facilities: 'Facilities',
  other: 'Other',
};

// Report statuses
const statuses = [
  'all',
  'open',
  'in_progress',
  'resolved',
  'rejected',
] as const;

const statusLabels: Record<string, string> = {
  all: 'All',
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

const statusColors: Record<string, string> = {
  open: '#D97706',
  in_progress: '#2563EB',
  resolved: '#16A34A',
  rejected: '#DC2626',
};

// Format Firestore timestamps
function formatDate(date: any) {
  if (!date?.toDate) return 'Just now';

  return date.toDate().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function HomeScreen() {
  const { user } = useAuth();

  // Report feed state
  const [reports, setReports] = useState<CampusReport[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<string>('all');
  const [selectedStatus, setSelectedStatus] =
    useState<string>('all');

  const [retryKey, setRetryKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Notification state
  const [notifications, setNotifications] =
    useState<CampusNotification[]>([]);
  const [notificationVisible, setNotificationVisible] =
    useState(false);
  const [notificationLoading, setNotificationLoading] =
    useState(false);
  const [notificationError, setNotificationError] =
    useState('');

  // Calculate unread notification count
  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;

  // Fetch notifications
  const loadNotifications = useCallback(async () => {
    try {
      setNotificationLoading(true);
      setNotificationError('');

      const data = await getNotifications();
      setNotifications(data);
    } catch (error: any) {
      console.error('Notification loading failed:', error);

      setNotificationError(
        error.message || 'Unable to load notifications.'
      );
    } finally {
      setNotificationLoading(false);
    }
  }, [user?.uid]);

  // Load notifications when the signed-in user becomes available
  useEffect(() => {
    if (user?.uid) {
      loadNotifications();
    }
  }, [user?.uid, loadNotifications]);

  // Subscribe to the live Firestore reports feed
  useEffect(() => {
    if (reports.length === 0) {
      setLoading(true);
    }

    setError('');

    const unsubscribe = subscribeToReports(
      (data) => {
        setReports(data);
        setLoading(false);
        setRefreshing(false);
        setError('');
      },
      (err) => {
        console.error('Report feed error:', err);

        setError(
          err.message || 'Unable to load reports.'
        );

        setLoading(false);
        setRefreshing(false);
      }
    );

    return unsubscribe;
  }, [retryKey]);

  // Refresh the report feed
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setError('');
    setRetryKey((current) => current + 1);
  }, []);

  // Apply category and status filters together
  const filteredReports = reports.filter((report) => {
    const matchesCategory =
      selectedCategory === 'all' ||
      report.category === selectedCategory;

    const matchesStatus =
      selectedStatus === 'all' ||
      report.status === selectedStatus;

    return matchesCategory && matchesStatus;
  });

  // Open notification panel
  const handleBellPress = () => {
    setNotificationVisible(true);
    loadNotifications();
  };

  // Handle individual notification selection
  const handleNotificationPress = async (
    notification: CampusNotification
  ) => {
    try {
      if (!notification.isRead) {
        await markNotificationAsRead(notification.id);

        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? { ...item, isRead: true }
              : item
          )
        );
      }

      setNotificationVisible(false);

      // Navigate to the related report
      if (
        notification.relatedEntityType === 'report' &&
        notification.relatedEntityId
      ) {
        router.push({
          pathname: '/report/[id]',
          params: {
            id: notification.relatedEntityId,
          },
        });
      }

      // Navigate to the polls tab
      else if (
        notification.relatedEntityType === 'poll'
      ) {
        router.push('/(tabs)/polls');
      }
    } catch (error: any) {
      console.error('Notification update failed:', error);

      setNotificationError(
        error.message || 'Unable to update notification.'
      );
    }
  };

  // Mark every notification as read
  const handleMarkAllAsRead = async () => {
    try {
      setNotificationError('');

      await markAllNotificationsAsRead();

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          isRead: true,
        }))
      );
    } catch (error: any) {
      console.error('Mark all as read failed:', error);

      setNotificationError(
        error.message || 'Unable to update notifications.'
      );
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // Render individual report cards
  const renderReport = ({
    item,
  }: {
    item: CampusReport;
  }) => (
    <Pressable
      style={styles.reportCard}
      onPress={() =>
        router.push({
          pathname: '/report/[id]',
          params: { id: item.id },
        })
      }
    >
      <View style={styles.cardTop}>
        <Text style={styles.category}>
          {categoryLabels[item.category] || item.category}
        </Text>

        <Text
          style={[
            styles.status,
            {
              color:
                statusColors[item.status] || '#64748B',
            },
          ]}
        >
          {statusLabels[item.status] || item.status}
        </Text>
      </View>

      <Text style={styles.reportTitle}>
        {item.title}
      </Text>

      <Text
        style={styles.description}
        numberOfLines={3}
      >
        {item.description}
      </Text>

      <View style={styles.cardFooter}>
        <Text style={styles.date}>
          {formatDate(item.createdAt)}
        </Text>

        <Text style={styles.viewDetails}>
          View details →
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Home header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>
            PulseCampus
          </Text>

          <Text style={styles.welcome}>
            Welcome, {user?.email?.split('@')[0] || 'Student'}
          </Text>
        </View>

        {/* Notification bell and logout */}
        <View style={styles.headerActions}>
          <Pressable
            onPress={handleBellPress}
            style={styles.bellButton}
          >
            <Text style={styles.bellIcon}>🔔</Text>

            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            <Text style={styles.logoutText}>
              Logout
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Campus feed heading */}
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.heading}>
            Campus Feed
          </Text>

          <Text style={styles.subtitle}>
            What's happening around campus?
          </Text>
        </View>

        <Pressable
          style={styles.createButton}
          onPress={() => router.push('/create-report')}
        >
          <Text style={styles.createButtonText}>
            + Report
          </Text>
        </Pressable>
      </View>

      {/* Category filters */}
      <View>
        <Text style={styles.filterHeading}>
          Category
        </Text>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item}
          style={styles.filterList}
          contentContainerStyle={styles.filterContent}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedCategory(item)}
              style={[
                styles.filterChip,
                selectedCategory === item &&
                  styles.activeFilter,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedCategory === item &&
                    styles.activeFilterText,
                ]}
              >
                {categoryLabels[item]}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Status filters */}
      <View>
        <Text style={styles.filterHeading}>
          Status
        </Text>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={statuses}
          keyExtractor={(item) => item}
          style={styles.filterList}
          contentContainerStyle={styles.filterContent}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedStatus(item)}
              style={[
                styles.filterChip,
                selectedStatus === item &&
                  styles.activeFilter,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedStatus === item &&
                    styles.activeFilterText,
                ]}
              >
                {statusLabels[item]}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Report feed: loading, error and empty states */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color="#3659D9"
          />

          <Text style={styles.helperText}>
            Loading campus reports...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {error}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={onRefresh}
          >
            <Text style={styles.retryText}>
              Retry
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredReports}
          keyExtractor={(item) => item.id}
          renderItem={renderReport}
          contentContainerStyle={styles.feedContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3659D9"
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {reports.length === 0
                  ? 'No reports yet'
                  : 'No matching reports'}
              </Text>

              <Text style={styles.emptyText}>
                {reports.length === 0
                  ? 'Be the first to share something happening on campus.'
                  : 'Try changing your category or status filters.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Notification modal */}
      <Modal
        visible={notificationVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setNotificationVisible(false)
        }
      >
        {/* Tap outside the panel to close it */}
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setNotificationVisible(false)}
        >
          {/* Inner panel prevents outside-tap closing */}
          <Pressable
            style={styles.notificationPanel}
            onPress={() => {}}
          >
            {/* Modal heading */}
            <View style={styles.notificationHeader}>
              <View>
                <Text style={styles.notificationTitle}>
                  Notifications
                </Text>

                <Text style={styles.notificationSubtitle}>
                  {unreadCount} unread
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setNotificationVisible(false)
                }
              >
                <Text style={styles.closeButton}>
                  ✕
                </Text>
              </Pressable>
            </View>

            {/* Mark all as read */}
            {unreadCount > 0 && (
              <Pressable
                onPress={handleMarkAllAsRead}
                style={styles.markAllButton}
              >
                <Text style={styles.markAllText}>
                  Mark all as read
                </Text>
              </Pressable>
            )}

            {/* Notification loading state */}
            {notificationLoading ? (
              <View style={styles.notificationEmpty}>
                <ActivityIndicator color="#3659D9" />

                <Text style={styles.helperText}>
                  Loading notifications...
                </Text>
              </View>
            ) : notificationError ? (
              <View style={styles.notificationEmpty}>
                <Text style={styles.errorText}>
                  {notificationError}
                </Text>

                <Pressable onPress={loadNotifications}>
                  <Text style={styles.markAllText}>
                    Retry
                  </Text>
                </Pressable>
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.notificationEmpty}>
                <Text style={styles.emptyTitle}>
                  No notifications yet
                </Text>

                <Text style={styles.emptyText}>
                  You're all caught up!
                </Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                style={styles.notificationList}
                renderItem={({ item }) => (
                  <Pressable
                    style={[
                      styles.notificationItem,
                      !item.isRead &&
                        styles.unreadNotification,
                    ]}
                    onPress={() =>
                      handleNotificationPress(item)
                    }
                  >
                    <View
                      style={styles.notificationItemTop}
                    >
                      <Text
                        style={styles.notificationItemTitle}
                      >
                        {item.title}
                      </Text>

                      {!item.isRead && (
                        <View style={styles.unreadDot} />
                      )}
                    </View>

                    <Text
                      style={styles.notificationMessage}
                    >
                      {item.message}
                    </Text>

                    <Text
                      style={styles.notificationDate}
                    >
                      {formatDate(item.createdAt)}
                    </Text>
                  </Pressable>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FC',
    paddingTop: 55,
  },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  brand: {
    fontSize: 25,
    fontWeight: '800',
    color: '#3659D9',
  },

  welcome: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 5,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E9EDFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  bellIcon: {
    fontSize: 20,
  },

  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  logoutButton: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 9,
    backgroundColor: '#E9EDFF',
  },

  logoutText: {
    color: '#3659D9',
    fontWeight: '700',
  },

  headingRow: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  heading: {
    fontSize: 23,
    fontWeight: '800',
    color: '#172033',
  },

  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 5,
  },

  createButton: {
    backgroundColor: '#3659D9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },

  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  filterHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginLeft: 20,
    marginTop: 12,
  },

  filterList: {
    maxHeight: 48,
    marginTop: 7,
    marginBottom: 3,
  },

  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
  },

  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  activeFilter: {
    backgroundColor: '#3659D9',
    borderColor: '#3659D9',
  },

  filterText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },

  activeFilterText: {
    color: '#FFFFFF',
  },

  feedContent: {
    padding: 18,
    paddingBottom: 35,
    flexGrow: 1,
  },

  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 17,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#E9EDF5',
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  category: {
    color: '#3659D9',
    fontSize: 12,
    fontWeight: '700',
  },

  status: {
    fontSize: 11,
    fontWeight: '800',
  },

  reportTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#172033',
    marginTop: 12,
  },

  description: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    marginTop: 7,
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 17,
  },

  date: {
    fontSize: 11,
    color: '#94A3B8',
  },

  viewDetails: {
    fontSize: 12,
    color: '#3659D9',
    fontWeight: '700',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
  },

  helperText: {
    marginTop: 12,
    color: '#64748B',
  },

  errorText: {
    color: '#DC2626',
    textAlign: 'center',
  },

  retryButton: {
    marginTop: 15,
    backgroundColor: '#3659D9',
    padding: 12,
    borderRadius: 9,
  },

  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  empty: {
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 25,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#172033',
  },

  emptyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },

  // Notification modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  notificationPanel: {
    width: '100%',
    maxHeight: '75%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
  },

  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  notificationTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#172033',
  },

  notificationSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },

  closeButton: {
    fontSize: 20,
    color: '#64748B',
    padding: 5,
  },

  markAllButton: {
    alignSelf: 'flex-end',
    marginTop: 15,
    marginBottom: 8,
  },

  markAllText: {
    color: '#3659D9',
    fontSize: 12,
    fontWeight: '700',
  },

  notificationList: {
    marginTop: 8,
  },

  notificationItem: {
    padding: 14,
    borderRadius: 11,
    backgroundColor: '#F8FAFC',
    marginBottom: 9,
    borderWidth: 1,
    borderColor: '#E9EDF5',
  },

  unreadNotification: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },

  notificationItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  notificationItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#172033',
    flex: 1,
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3659D9',
    marginLeft: 8,
  },

  notificationMessage: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 6,
  },

  notificationDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 8,
  },

  notificationEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 10,
  },
});
