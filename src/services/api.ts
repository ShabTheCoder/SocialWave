import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp, 
  serverTimestamp,
  addDoc,
  increment,
  arrayUnion,
  arrayRemove,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '../firebase';
import { Post, OperationType } from '../types';

const handleFirestoreError = (error: any, operationType: OperationType, path: string | null) => {
  console.error(`Firestore Error [${operationType}] at ${path}:`, error);
  throw error;
};

export const api = {
  async getPosts(lastVisible?: QueryDocumentSnapshot<DocumentData>): Promise<{ posts: Post[], lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
    const path = 'posts';
    try {
      let q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(15));
      if (lastVisible) {
        q = query(collection(db, path), orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(15));
      }
      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
      return { posts, lastDoc };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return { posts: [], lastDoc: null };
    }
  },

  async getPostsByUser(userId: string): Promise<Post[]> {
    const path = 'posts';
    try {
      const q = query(
        collection(db, path), 
        where('authorId', '==', userId),
        orderBy('createdAt', 'desc'), 
        limit(50)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  async getPostsByHashtag(tag: string): Promise<Post[]> {
    const path = 'posts';
    try {
      const q = query(
        collection(db, path), 
        where('hashtags', 'array-contains', tag.toLowerCase()),
        orderBy('createdAt', 'desc'), 
        limit(20)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  async createPost(post: Omit<Post, 'id' | 'createdAt' | 'likesCount' | 'commentsCount'>): Promise<void> {
    const path = 'posts';
    try {
      await addDoc(collection(db, path), {
        ...post,
        createdAt: serverTimestamp(),
        likesCount: 0,
        commentsCount: 0,
        hashtags: post.content.match(/#\w+/g)?.map(tag => tag.slice(1).toLowerCase()) || []
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async getUser(userId: string): Promise<any> {
    const path = `users/${userId}`;
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async syncUser(user: { id: string; displayName: string; photoURL: string; email: string; bio?: string }): Promise<void> {
    const path = `users/${user.id}`;
    try {
      const docRef = doc(db, 'users', user.id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await setDoc(docRef, {
          ...user,
          uid: user.id,
          createdAt: serverTimestamp(),
          role: 'client'
        });
      } else {
        const existingData = docSnap.data();
        // Only update if something actually changed to save on write quota
        const hasChanged = 
          existingData.displayName !== user.displayName ||
          existingData.photoURL !== user.photoURL ||
          existingData.email !== user.email ||
          (user.bio !== undefined && existingData.bio !== user.bio);

        if (hasChanged) {
          await updateDoc(docRef, {
            displayName: user.displayName,
            photoURL: user.photoURL,
            email: user.email,
            bio: user.bio || existingData.bio || ''
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async likePost(postId: string, userId: string): Promise<void> {
    const path = `posts/${postId}`;
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        likesCount: increment(1)
      });
      // In a real app, you'd also track WHO liked it in a subcollection or array
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async unlikePost(postId: string, userId: string): Promise<void> {
    const path = `posts/${postId}`;
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        likesCount: increment(-1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async getNotifications(userId: string): Promise<any[]> {
    const path = `users/${userId}/notifications`;
    try {
      const q = query(collection(db, 'users', userId, 'notifications'), orderBy('createdAt', 'desc'), limit(20));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  async createNotification(userId: string, notif: any): Promise<void> {
    const path = `users/${userId}/notifications`;
    try {
      await addDoc(collection(db, 'users', userId, 'notifications'), {
        ...notif,
        createdAt: serverTimestamp(),
        read: false
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async getChats(userId: string): Promise<any[]> {
    const path = 'chats';
    try {
      const q = query(collection(db, 'chats'), where('participants', 'array-contains', userId), orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  async getMessages(chatId: string): Promise<any[]> {
    const path = `chats/${chatId}/messages`;
    try {
      const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'), limit(100));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  async sendMessage(chatId: string, message: { senderId: string; text: string }): Promise<void> {
    const path = `chats/${chatId}/messages`;
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        ...message,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'chats', chatId), {
        updatedAt: serverTimestamp(),
        lastMessage: message.text
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async listUsers(): Promise<any[]> {
    const path = 'users';
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  async createChat(participants: string[]): Promise<string> {
    const path = 'chats';
    try {
      const docRef = await addDoc(collection(db, 'chats'), {
        participants,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        isGroup: false
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return '';
    }
  },

  async getBookmarks(userId: string): Promise<any[]> {
    const path = `users/${userId}/bookmarks`;
    try {
      const snapshot = await getDocs(collection(db, 'users', userId, 'bookmarks'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },
};
