// src/lib/firebase/firestore.ts
import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    DocumentData,
    QueryConstraint
} from "firebase/firestore";
import { db } from "./client";

export const getDocument = async (collectionName: string, id: string) => {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    } else {
        return null;
    }
};

export const getCollection = async (collectionName: string, constraints: QueryConstraint[] = []) => {
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addDocument = async (collectionName: string, data: DocumentData) => {
    const collectionRef = collection(db, collectionName);
    return await addDoc(collectionRef, data);
};

export const updateDocument = async (collectionName: string, id: string, data: DocumentData) => {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, data);
};

export const deleteDocument = async (collectionName: string, id: string) => {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
};
