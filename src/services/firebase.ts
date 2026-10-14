/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  initializeFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { InvoiceDocument } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.info('Firestore Notice: ', JSON.stringify(errInfo));
  return errInfo;
}

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with Database ID and force long-polling for rock-solid iframe connectivity
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google Popup
 */
export async function loginWithGoogle(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Sign out
 */
export async function logoutFirebase(): Promise<void> {
  await signOut(auth);
}

/**
 * Save / Update an invoice in Firestore
 */
export async function saveInvoiceToFirestore(invoice: InvoiceDocument): Promise<void> {
  // Only attempt write if user is authenticated or auth token is present
  if (!auth.currentUser) {
    return;
  }

  const path = `invoices/${invoice.id}`;
  try {
    await setDoc(doc(db, 'invoices', invoice.id), {
      ...invoice,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Seed initial invoices to Firestore if collection is empty
 */
export async function seedInitialInvoicesIfEmpty(initialList: InvoiceDocument[]): Promise<void> {
  if (!auth.currentUser) {
    return;
  }

  const path = 'invoices';
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty) {
      console.log('Seeding initial invoices into Firestore...');
      for (const item of initialList) {
        await setDoc(doc(db, 'invoices', item.id), item);
      }
    }
  } catch (err: any) {
    console.info('Firestore seeding note:', err?.message || err);
  }
}

/**
 * Listen to real-time invoices from Firestore
 */
export function subscribeToInvoices(
  onData: (invoices: InvoiceDocument[]) => void,
  onError?: (err: any) => void
) {
  if (!auth.currentUser) {
    return () => {};
  }

  const path = 'invoices';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      if (!snapshot.empty) {
        const docs: InvoiceDocument[] = [];
        snapshot.forEach((d) => {
          docs.push(d.data() as InvoiceDocument);
        });
        onData(docs);
      }
    },
    (err) => {
      console.info('Firestore snapshot listener note:', err?.message || err);
      if (onError) onError(err);
    }
  );
}
