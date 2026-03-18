import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  bio?: string;
  createdAt: Timestamp;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // Array of user UIDs
}

export interface Poll {
  question: string;
  options: PollOption[];
  expiresAt: Timestamp;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  imageUrl?: string;
  createdAt: any;
  likesCount: number;
  commentsCount: number;
  quotedPostId?: string;
  quotedPost?: Partial<Post>;
  hashtags?: string[];
  mentions?: string[];
  mentionMap?: Record<string, string>;
  poll?: Poll;
}

export interface Comment {
  id: string;
  postId: string;
  authorUid: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  createdAt: Timestamp;
  mentionMap?: Record<string, string>;
}

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
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
