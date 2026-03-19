import { Post } from '../types';

const API_BASE = '/api';

export const api = {
  async getPosts(authorId?: string): Promise<{ posts: Post[], lastDoc: any | null }> {
    const url = authorId ? `${API_BASE}/posts?authorId=${authorId}` : `${API_BASE}/posts`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch posts');
    const posts = await res.json();
    return { posts, lastDoc: null };
  },

  async getPostsByUser(userId: string): Promise<Post[]> {
    const res = await fetch(`${API_BASE}/posts?authorId=${userId}`);
    if (!res.ok) throw new Error('Failed to fetch user posts');
    return res.json();
  },

  async getPostsByHashtag(hashtag: string): Promise<Post[]> {
    const res = await fetch(`${API_BASE}/posts/hashtag/${hashtag}`);
    if (!res.ok) throw new Error('Failed to fetch hashtag posts');
    return res.json();
  },

  async createPost(post: Omit<Post, 'id' | 'createdAt' | 'likesCount' | 'commentsCount'>): Promise<void> {
    const res = await fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...post,
        id: Math.random().toString(36).substr(2, 9),
      }),
    });
    if (!res.ok) throw new Error('Failed to create post');
  },

  async getUser(userId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/users/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch user');
    return res.json();
  },

  async syncUser(user: { id: string; displayName: string; photoURL: string; email: string; bio?: string; theme?: string }): Promise<void> {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (!res.ok) throw new Error('Failed to sync user');
  },

  async updateUserTheme(userId: string, theme: string): Promise<void> {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, theme }),
    });
    if (!res.ok) throw new Error('Failed to update theme');
  },

  async likePost(postId: string, userId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/likes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: `${userId}_${postId}`,
        postId,
        userId,
      }),
    });
    if (!res.ok) throw new Error('Failed to like post');
  },

  async unlikePost(postId: string, userId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/likes?postId=${postId}&userId=${userId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to unlike post');
  },

  async deletePost(postId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/posts/${postId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete post');
  },

  async votePoll(postId: string, userId: string, optionId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/posts/${postId}/poll/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, optionId }),
    });
    if (!res.ok) throw new Error('Failed to vote on poll');
    return res.json();
  },

  async exportDb(userId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/export?userId=${userId}`);
    if (!res.ok) throw new Error('Failed to export database');
    return res.json();
  },

  async importDb(data: any, userId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, userId }),
    });
    if (!res.ok) throw new Error('Failed to import database');
  },

  async getNotifications(userId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/notifications/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  async createNotification(userId: string, notif: any): Promise<void> {
    const res = await fetch(`${API_BASE}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...notif,
        id: Math.random().toString(36).substr(2, 9),
        userId,
      }),
    });
    if (!res.ok) throw new Error('Failed to create notification');
  },

  // Ads
  async getAds(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/ads`);
    if (!res.ok) throw new Error('Failed to fetch ads');
    return res.json();
  },

  async createAd(userId: string, ad: any): Promise<void> {
    const res = await fetch(`${API_BASE}/ads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ad }),
    });
    if (!res.ok) throw new Error('Failed to create ad');
  },

  async deleteAd(userId: string, adId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/ads/${adId}?userId=${userId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete ad');
  },

  async toggleAdStatus(userId: string, adId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/ads/${adId}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error('Failed to toggle ad status');
  },

  async getChats(userId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/chats/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch chats');
    return res.json();
  },

  async getMessages(chatId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/messages/${chatId}`);
    if (!res.ok) throw new Error('Failed to fetch messages');
    return res.json();
  },

  async sendMessage(chatId: string, message: { senderId: string; text: string }): Promise<void> {
    const res = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...message,
        id: Math.random().toString(36).substr(2, 9),
        chatId,
      }),
    });
    if (!res.ok) throw new Error('Failed to send message');
  },

  async listUsers(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async createChat(participants: string[]): Promise<string> {
    const id = Math.random().toString(36).substr(2, 9);
    const res = await fetch(`${API_BASE}/chats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, participants }),
    });
    if (!res.ok) throw new Error('Failed to create chat');
    return id;
  },

  async getBookmarks(userId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/bookmarks/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch bookmarks');
    return res.json();
  },
};
