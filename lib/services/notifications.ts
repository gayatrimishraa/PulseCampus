
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import type { CampusNotification } from '@/types/models';

// Fetch notifications belonging to the signed-in student.
export async function getNotifications(): Promise<CampusNotification[]> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('You must be logged in to view notifications.');
  }

  const notificationsQuery = query(
    collection(db, 'users', user.uid, 'notification'),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(notificationsQuery);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  })) as CampusNotification[];
}

// Mark an individual notification as read.
export async function markNotificationAsRead(
  notificationId: string
): Promise<void> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('You must be logged in to update notifications.');
  }

  if (!notificationId.trim()) {
    throw new Error('Notification ID is required.');
  }

  const notificationRef = doc(
    db,
    'users',
    user.uid,
    'notification',
    notificationId
  );

  await updateDoc(notificationRef, {
    isRead: true,
  });
}

// Mark all unread notifications as read.
export async function markAllNotificationsAsRead(): Promise<void> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('You must be logged in to update notifications.');
  }

  const unreadQuery = query(
    collection(db, 'users', user.uid, 'notification'),
    where('isRead', '==', false)
  );

  const snapshot = await getDocs(unreadQuery);

  await Promise.all(
    snapshot.docs.map((document) =>
      updateDoc(document.ref, {
        isRead: true,
      })
    )
  );
}
