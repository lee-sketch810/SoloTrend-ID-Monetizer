import { 
  collection, 
  addDoc, 
  updateDoc,
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  serverTimestamp,
  deleteDoc,
  doc,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface IdeaRecord {
  id: string;
  title: string;
  category: "App" | "E-book" | "YouTube" | "Blog" | "Threads" | "Service" | "Physical";
  trendSource: string;
  description: string;
  monetizationStrategy: string;
  detailedContent?: string;
  createdAt: Timestamp;
  userId: string;
}

export const saveIdea = async (idea: Omit<IdeaRecord, 'id' | 'createdAt' | 'userId'> & { id?: string }) => {
  if (!auth.currentUser) throw new Error("User not authenticated");
  
  try {
    if (idea.id) {
      // Update existing
      const { id, ...data } = idea;
      await updateDoc(doc(db, 'ideas', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
    } else {
      // Create new
      await addDoc(collection(db, 'ideas'), {
        ...idea,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Error saving idea:", error);
    throw error;
  }
};

export const deleteIdea = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'ideas', id));
  } catch (error) {
    console.error("Error deleting idea:", error);
    throw error;
  }
};

export const subscribeToIdeas = (callback: (ideas: IdeaRecord[]) => void) => {
  if (!auth.currentUser) return () => {};

  const q = query(
    collection(db, 'ideas'),
    where('userId', '==', auth.currentUser.uid),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const ideas = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as IdeaRecord[];
    callback(ideas);
  }, (error) => {
    console.error("Firestore subscription error:", error);
  });
};
