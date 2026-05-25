import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import { StockItem } from './types';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App and export instances
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

// Test Connection Helper according to SKILL.md
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase Firestore connection tested successfully.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration. The client is offline.');
    }
  }
}

// Error Handler adhering strictly to FirestoreErrorInfo format in SKILL.md
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- High level Firestore operations ---

const COLLECTION_NAME = 'items';

/**
 * Fetch all items from Firestore.
 * If Firestore is empty, bootstraps and saves the provided defaults.
 */
export async function getFirebaseItems(defaultPresets: StockItem[]): Promise<StockItem[]> {
  try {
    const listPath = COLLECTION_NAME;
    const querySnapshot = await getDocs(collection(db, listPath));
    const itemsList: StockItem[] = [];

    querySnapshot.forEach((docSnap) => {
      itemsList.push(docSnap.data() as StockItem);
    });

    if (itemsList.length === 0 && defaultPresets.length > 0) {
      console.log('Firestore is empty. Bootstrapping with DEFAULT_PRESETS...');
      const batch = writeBatch(db);
      defaultPresets.forEach((item) => {
        const docRef = doc(db, COLLECTION_NAME, item.id);
        batch.set(docRef, item);
      });
      await batch.commit();
      return defaultPresets;
    }

    return itemsList;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
  }
}

/**
 * Save (create or overwrite) a StockItem document in Firestore
 */
export async function saveFirebaseItem(item: StockItem): Promise<void> {
  const docPath = `${COLLECTION_NAME}/${item.id}`;
  try {
    const docRef = doc(db, COLLECTION_NAME, item.id);
    await setDoc(docRef, item);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

/**
 * Delete a StockItem document from Firestore
 */
export async function deleteFirebaseItem(id: string): Promise<void> {
  const docPath = `${COLLECTION_NAME}/${id}`;
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

/**
 * Bulk overwrite / reset database items (e.g. restore presets)
 */
export async function resetFirebaseDatabase(itemsList: StockItem[]): Promise<void> {
  const listPath = COLLECTION_NAME;
  try {
    // First, fetch current ones to delete them so we don't leave orphaned files
    const querySnapshot = await getDocs(collection(db, listPath));
    const deleteBatch = writeBatch(db);
    querySnapshot.forEach((docSnap) => {
      deleteBatch.delete(docSnap.ref);
    });
    await deleteBatch.commit();

    // Now, write all new presets
    const writeBatchInstance = writeBatch(db);
    itemsList.forEach((item) => {
      const docRef = doc(db, COLLECTION_NAME, item.id);
      writeBatchInstance.set(docRef, item);
    });
    await writeBatchInstance.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, listPath);
  }
}
