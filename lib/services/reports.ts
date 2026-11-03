
import {
    addDoc,
    collection,
    doc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where,
    type Timestamp,
} from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import type {
    CampusReport,
    ReportCategory,
    ReportLocation,
} from '@/types/models';

export interface CreateReportInput {
  title: string;
  description: string;
  category: ReportCategory;
  buildingId: string | null;
  location: ReportLocation | null;
  expiresAt: Timestamp | null;
}

export interface UpdateReportInput {
  title: string;
  description: string;
  category: ReportCategory;
  buildingId: string | null;
  location: ReportLocation | null;
}

const reportsCollection = collection(db, 'reports');

function mapReports(snapshot: any): CampusReport[] {
  return snapshot.docs.map((document: any) => ({
    id: document.id,
    ...document.data(),
  })) as CampusReport[];
}

export async function createReport(input: CreateReportInput) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('You must be logged in to create a report.');
  }

  const title = input.title.trim();
  const description = input.description.trim();

  if (!title || !description) {
    throw new Error('Report title and description are required.');
  }

  const reportData = {
    title,
    description,
    category: input.category,
    createdBy: user.uid,
    buildingId: input.buildingId,
    location: input.location,
    status: 'open' as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expiresAt: input.expiresAt,
  };

  const reportRef = await addDoc(reportsCollection, reportData);
  return reportRef.id;
}

export async function getReports(): Promise<CampusReport[]> {
  const reportsQuery = query(
    reportsCollection,
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(reportsQuery);
  return mapReports(snapshot);
}

export function subscribeToReports(
  callback: (reports: CampusReport[]) => void,
  onError?: (error: Error) => void
) {
  const reportsQuery = query(
    reportsCollection,
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    reportsQuery,
    (snapshot) => callback(mapReports(snapshot)),
    (error) => onError?.(error)
  );
}

export async function getMyReports(): Promise<CampusReport[]> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('You must be logged in to view your reports.');
  }

  const myReportsQuery = query(
    reportsCollection,
    where('createdBy', '==', user.uid)
  );

  const snapshot = await getDocs(myReportsQuery);
  const reports = mapReports(snapshot);

  return reports.sort(
    (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
  );
}

export function subscribeToMyReports(
  callback: (reports: CampusReport[]) => void,
  onError?: (error: Error) => void
) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('You must be logged in to view your reports.');
  }

  const myReportsQuery = query(
    reportsCollection,
    where('createdBy', '==', user.uid)
  );

  return onSnapshot(
    myReportsQuery,
    (snapshot) => {
      const reports = mapReports(snapshot);
      reports.sort(
        (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
      );
      callback(reports);
    },
    (error) => onError?.(error)
  );
}

export async function updateReport(
  reportId: string,
  input: UpdateReportInput
): Promise<void> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('You must be logged in to edit a report.');
  }

  if (!reportId.trim()) {
    throw new Error('Report ID is required.');
  }

  if (!input.title.trim() || !input.description.trim()) {
    throw new Error('Report title and description are required.');
  }

  await updateDoc(doc(db, 'reports', reportId), {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    buildingId: input.buildingId,
    location: input.location,
  });
}
