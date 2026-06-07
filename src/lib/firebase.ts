import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";
import { LoveLetter } from "../types";

// Initialize standard modules
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
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
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error Detailed info: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Dual-Database Synchronization Layer (Client-Firestore & Express Fallback)
export async function saveLoveLetter(letter: LoveLetter): Promise<string> {
  const id = letter.id || "love_" + Math.random().toString(36).substring(2, 11);
  const dataToSave = {
    ...letter,
    id,
    createdAt: letter.createdAt || new Date().toISOString(),
  };

  // 1. Persist to Express server backend (which acts as a backup & API gateway)
  let serverId = id;
  try {
    const serverRes = await fetch("/api/letters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataToSave),
    });
    if (serverRes.ok) {
      const serverData = await serverRes.json();
      serverId = serverData.id || id;
    }
  } catch (err) {
    console.warn("Express fallback database write failed, continuing with direct Firestore write:", err);
  }

  // 2. Persist directly to durable cloud-hosted Firestore with compliance-hardened Error Handling
  const docPath = `letters/${serverId}`;
  try {
    const letterRef = doc(db, "letters", serverId);
    await setDoc(letterRef, dataToSave);
  } catch (err) {
    // If the error stems from permissions/rules fail, standard format must trace
    if (err instanceof Error && (err.message.includes("permission") || err.message.includes("Permission"))) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    } else {
      console.error("Direct Firestore write failed:", err);
      throw err;
    }
  }

  return serverId;
}

export async function fetchLoveLetter(id: string): Promise<LoveLetter> {
  const docPath = `letters/${id}`;
  // Try to load from durable Firestore first
  try {
    const docRef = doc(db, "letters", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as LoveLetter;
    }
  } catch (err) {
    if (err instanceof Error && (err.message.includes("permission") || err.message.includes("Permission"))) {
      handleFirestoreError(err, OperationType.GET, docPath);
    } else {
      console.warn("Direct Firestore read failed, triaging to Express API fallback:", err);
    }
  }

  // Fallback: Read directly from Express Server Database
  const res = await fetch(`/api/letters/${id}`);
  if (!res.ok) {
    throw new Error("Não encontramos essa carta especial. Verifique se o link ou QR code foi colado corretamente!");
  }
  return await res.json();
}
