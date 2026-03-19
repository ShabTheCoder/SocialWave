export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  bio?: string;
  createdAt: any;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // Array of user UIDs
}

export interface Poll {
  question: string;
  options: PollOption[];
  expiresAt: any;
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
  createdAt: any;
  mentionMap?: Record<string, string>;
}

export interface Ad {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  ctaText: string;
  ctaUrl: string;
  type: 'feed' | 'sidebar';
  active: boolean;
  createdAt: string;
}
