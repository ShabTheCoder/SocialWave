import { Post, OperationType } from '../types';

const API_BASE = '/api';

const handleApiError = (error: any, operationType: OperationType, path: string) => {
  console.error(`API Error [${operationType}] at ${path}:`, error);
  throw error;
};

export const api = {
  async getPosts(lastVisible?: any): Promise<{ posts: Post[], lastDoc: any | null }> {
    try {
      const res = await fetch(`${API_BASE}/posts`);
      if (!res.ok) throw new Error('Failed to fetch posts');
      const posts = await res.json();
      return { posts, lastDoc: null };
    } catch (error) {
      handleApiError(error, OperationType.GET, 'posts');
      return { posts: [], lastDoc: null };
    }
  },

  async getPostsByUser(userId: string): Promise<Post[]> {
    try {
      const res = await fetch(`${API_BASE}/posts?authorId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch user posts');
      return await res.json();
    } catch (error) {
      handleApiError(error, OperationType.GET, `posts/${userId}`);
      return [];
    }
  },

  async getPostsByHashtag(hashtag: string): Promise<Post[]> {
    try {
      const res = await fetch(`${API_BASE}/posts/hashtag/${hashtag}`);
      if (!res.ok) throw new Error('Failed to fetch hashtag posts');
      return await res.json();
    } catch (error) {
      handleApiError(error, OperationType.GET, `posts/hashtag/${hashtag}`);
      return [];
    }
  },

  async createPost(post: Omit<Post, 'id' | 'createdAt' | 'likesCount' | 'commentsCount'>): Promise<void> {
    try {
      // Extract hashtags from content
      const hashtags = post.content.match(/#[a-z0-9_]+/gi)?.map(tag => tag.slice(1).toLowerCase()) || [];
      
      const res = await fetch(`${API_BASE}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          ...post,
          hashtags
        })
      });
      if (!res.ok) throw new Error('Failed to create post');
    } catch (error) {
      handleApiError(error, OperationType.CREATE, 'posts');
    }
  },

  async getUser(userId: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch user');
      return await res.json();
    } catch (error) {
      handleApiError(error, OperationType.GET, `users/${userId}`);
    }
  },

  async syncUser(user: { id: string; displayName: string; photoURL: string; email: string; bio?: string }): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      if (!res.ok) throw new Error('Failed to sync user');
    } catch (error) {
      handleApiError(error, OperationType.WRITE, `users/${user.id}`);
    }
  },

  async likePost(postId: string, userId: string): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: crypto.randomUUID(), postId, userId })
      });
      if (!res.ok) throw new Error('Failed to like post');
    } catch (error) {
      handleApiError(error, OperationType.UPDATE, `posts/${postId}`);
    }
  },

  async unlikePost(postId: string, userId: string): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/likes?postId=${postId}&userId=${userId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to unlike post');
    } catch (error) {
      handleApiError(error, OperationType.UPDATE, `posts/${postId}`);
    }
  },

  async getNotifications(userId: string): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/notifications/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return await res.json();
    } catch (error) {
      handleApiError(error, OperationType.GET, `notifications/${userId}`);
      return [];
    }
  },

  async createNotification(userId: string, notif: any): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: crypto.randomUUID(), userId, ...notif })
      });
      if (!res.ok) throw new Error('Failed to create notification');
    } catch (error) {
      handleApiError(error, OperationType.CREATE, `notifications/${userId}`);
    }
  },

  async getChats(userId: string): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/chats/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch chats');
      return await res.json();
    } catch (error) {
      handleApiError(error, OperationType.GET, 'chats');
      return [];
    }
  },

  async getMessages(chatId: string): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/messages/${chatId}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      return await res.json();
    } catch (error) {
      handleApiError(error, OperationType.GET, `messages/${chatId}`);
      return [];
    }
  },

  async sendMessage(chatId: string, message: { senderId: string; text: string }): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: crypto.randomUUID(), chatId, ...message })
      });
      if (!res.ok) throw new Error('Failed to send message');
    } catch (error) {
      handleApiError(error, OperationType.CREATE, `messages/${chatId}`);
    }
  },

  async listUsers(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/users`);
      if (!res.ok) throw new Error('Failed to list users');
      return await res.json();
    } catch (error) {
      handleApiError(error, OperationType.GET, 'users');
      return [];
    }
  },

  async createChat(participants: string[]): Promise<string> {
    try {
      const id = crypto.randomUUID();
      const res = await fetch(`${API_BASE}/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, participants })
      });
      if (!res.ok) throw new Error('Failed to create chat');
      return id;
    } catch (error) {
      handleApiError(error, OperationType.CREATE, 'chats');
      return '';
    }
  },

  async getBookmarks(userId: string): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/bookmarks/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch bookmarks');
      return await res.json();
    } catch (error) {
      handleApiError(error, OperationType.GET, `bookmarks/${userId}`);
      return [];
    }
  },
};
