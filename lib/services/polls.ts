
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type {
  CampusPoll,
  PollOptionResult,
  PollVote,
} from '@/types/models';

// Create a new campus poll
export async function createPoll(
  pollData: Omit<
    CampusPoll,
    'id' | 'createdAt' | 'updatedAt'
  >
): Promise<string> {
  const pollsRef = collection(db, 'polls');

  const pollDoc = await addDoc(pollsRef, {
    ...pollData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return pollDoc.id;
}

// Fetch all published polls
export async function getPublishedPolls(): Promise<CampusPoll[]> {
  const pollsRef = collection(db, 'polls');

  const pollsQuery = query(
    pollsRef,
    where('status', '==', 'published')
  );

  const snapshot = await getDocs(pollsQuery);

  return snapshot.docs.map((pollDoc) => ({
    id: pollDoc.id,
    ...pollDoc.data(),
  })) as CampusPoll[];
}

// Check whether a student has already voted
export async function hasUserVoted(
  pollId: string,
  userId: string
): Promise<boolean> {
  const voteRef = doc(db, 'polls', pollId, 'votes', userId);
  const voteSnapshot = await getDoc(voteRef);

  return voteSnapshot.exists();
}

// Submit one immutable vote per student
export async function submitVote(
  pollId: string,
  userId: string,
  optionId: string
): Promise<void> {
  const pollRef = doc(db, 'polls', pollId);
  const voteRef = doc(db, 'polls', pollId, 'votes', userId);

  const [pollSnapshot, existingVote] = await Promise.all([
    getDoc(pollRef),
    getDoc(voteRef),
  ]);

  if (!pollSnapshot.exists()) {
    throw new Error('This poll no longer exists.');
  }

  if (existingVote.exists()) {
    throw new Error('You have already voted in this poll.');
  }

  const poll = pollSnapshot.data() as CampusPoll;

  if (poll.status !== 'published') {
    throw new Error('This poll is not accepting votes.');
  }

  if (Date.now() < poll.startsAt.toMillis()) {
    throw new Error('Voting has not started yet.');
  }

  if (Date.now() >= poll.endsAt.toMillis()) {
    throw new Error('Voting for this poll has ended.');
  }

  if (!poll.optionIds.includes(optionId)) {
    throw new Error('Invalid voting option.');
  }

  await setDoc(voteRef, {
    userId,
    optionId,
    createdAt: serverTimestamp(),
  });
}

// Fetch a single poll by ID
export async function getPollById(
  pollId: string
): Promise<CampusPoll | null> {
  const pollRef = doc(db, 'polls', pollId);
  const pollSnapshot = await getDoc(pollRef);

  if (!pollSnapshot.exists()) {
    return null;
  }

  return {
    id: pollSnapshot.id,
    ...pollSnapshot.data(),
  } as CampusPoll;
}

// Calculate results only after the poll expires
export async function getPollResults(
  pollId: string
): Promise<PollOptionResult[]> {
  const poll = await getPollById(pollId);

  if (!poll) {
    throw new Error('This poll no longer exists.');
  }

  if (Date.now() < poll.endsAt.toMillis()) {
    throw new Error('Results will be available after voting ends.');
  }

  if (!['published', 'closed'].includes(poll.status)) {
    throw new Error('Results are unavailable for this poll.');
  }

  const votesRef = collection(
    db,
    'polls',
    pollId,
    'votes'
  );

  const snapshot = await getDocs(votesRef);

  // Initialise every option with zero votes.
  const counts = new Map<string, number>();

  for (const option of poll.options) {
    counts.set(option.id, 0);
  }

  // Count votes after expiry.
  for (const voteDoc of snapshot.docs) {
    const vote = voteDoc.data() as PollVote;

    if (counts.has(vote.optionId)) {
      counts.set(
        vote.optionId,
        (counts.get(vote.optionId) ?? 0) + 1
      );
    }
  }

  return poll.options.map((option) => ({
    optionId: option.id,
    count: counts.get(option.id) ?? 0,
  }));
}
