import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("local.db");
db.pragma('journal_mode = WAL');

function initDb() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        displayName TEXT,
        photoURL TEXT,
        email TEXT,
        bio TEXT,
        theme TEXT DEFAULT 'light',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migration: Add theme column if it doesn't exist
    const userTableInfo = db.prepare("PRAGMA table_info(users)").all();
    if (!userTableInfo.some((col: any) => col.name === 'theme')) {
      db.exec("ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'light'");
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS ads (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        imageUrl TEXT,
        ctaText TEXT DEFAULT 'Learn More',
        ctaUrl TEXT NOT NULL,
        type TEXT DEFAULT 'feed', -- 'feed' or 'sidebar'
        active INTEGER DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add default ads if none exist
    const adsCount = db.prepare("SELECT COUNT(*) as count FROM ads").get() as any;
    if (adsCount.count === 0) {
      const defaultAds = [
        {
          id: 'ad-1',
          title: 'Explore the New Wave',
          description: 'Discover trending communities and connect with like-minded creators.',
          imageUrl: 'https://picsum.photos/seed/explore/1200/800',
          ctaText: 'Explore Now',
          ctaUrl: '/discover',
          type: 'feed'
        },
        {
          id: 'ad-2',
          title: 'SocialWave Gear',
          description: 'Get the official SocialWave merchandise and show your support.',
          imageUrl: 'https://picsum.photos/seed/gear/1200/800',
          ctaText: 'Shop Now',
          ctaUrl: '#',
          type: 'feed'
        },
        {
          id: 'ad-3',
          title: 'Premium Wave Experience',
          description: 'Get verified, enjoy ad-free experience and exclusive features.',
          imageUrl: 'https://picsum.photos/seed/premium/800/600',
          ctaText: 'Upgrade Now',
          ctaUrl: '#',
          type: 'sidebar'
        },
        {
          id: 'ad-4',
          title: 'SocialWave for Business',
          description: 'Reach thousands of users with targeted ads and insights.',
          imageUrl: 'https://picsum.photos/seed/business/800/600',
          ctaText: 'Learn More',
          ctaUrl: '#',
          type: 'sidebar'
        }
      ];

      const insertAd = db.prepare(`
        INSERT INTO ads (id, title, description, imageUrl, ctaText, ctaUrl, type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const ad of defaultAds) {
        insertAd.run(ad.id, ad.title, ad.description, ad.imageUrl, ad.ctaText, ad.ctaUrl, ad.type);
      }
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        authorId TEXT,
        authorName TEXT,
        authorPhoto TEXT,
        content TEXT,
        imageUrl TEXT,
        hashtags TEXT,
        poll TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        likesCount INTEGER DEFAULT 0,
        commentsCount INTEGER DEFAULT 0,
        FOREIGN KEY (authorId) REFERENCES users(id)
      )
    `);

    const postTableInfo = db.prepare("PRAGMA table_info(posts)").all();

    // Migration: Add poll column to posts if it doesn't exist
    if (!postTableInfo.some((col: any) => col.name === 'poll')) {
      db.exec("ALTER TABLE posts ADD COLUMN poll TEXT");
    }

    // Migration: Add likesCount and commentsCount to posts if they don't exist
    if (!postTableInfo.some((col: any) => col.name === 'likesCount')) {
      db.exec("ALTER TABLE posts ADD COLUMN likesCount INTEGER DEFAULT 0");
    }
    if (!postTableInfo.some((col: any) => col.name === 'commentsCount')) {
      db.exec("ALTER TABLE posts ADD COLUMN commentsCount INTEGER DEFAULT 0");
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS likes (
        id TEXT PRIMARY KEY,
        postId TEXT,
        userId TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (postId) REFERENCES posts(id),
        FOREIGN KEY (userId) REFERENCES users(id),
        UNIQUE(postId, userId)
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        userId TEXT,
        type TEXT,
        fromId TEXT,
        fromName TEXT,
        fromPhoto TEXT,
        postId TEXT,
        read BOOLEAN DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        lastMessageAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        unreadCount TEXT
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS chat_participants (
        chatId TEXT,
        userId TEXT,
        PRIMARY KEY (chatId, userId),
        FOREIGN KEY (chatId) REFERENCES chats(id),
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chatId TEXT,
        senderId TEXT,
        text TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chatId) REFERENCES chats(id)
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        userId TEXT,
        postId TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (postId) REFERENCES posts(id),
        UNIQUE(userId, postId)
      )
    `);
    console.log("Local SQLite DB initialized");
  } catch (err) {
    console.error("Failed to initialize Local SQLite DB:", err);
  }
}

async function startServer() {
  initDb();
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // API Routes
  app.get("/api/posts", (req, res) => {
    const { authorId } = req.query;
    try {
      let posts;
      if (authorId) {
        posts = db.prepare("SELECT * FROM posts WHERE authorId = ? ORDER BY createdAt DESC LIMIT 50").all(authorId);
      } else {
        posts = db.prepare("SELECT * FROM posts ORDER BY createdAt DESC LIMIT 50").all();
      }
      
      const formattedPosts = posts.map((row: any) => ({
        ...row,
        hashtags: JSON.parse(row.hashtags || "[]"),
        poll: row.poll ? JSON.parse(row.poll) : null,
        createdAt: row.createdAt.includes('Z') ? row.createdAt : (row.createdAt.includes(' ') ? row.createdAt.replace(' ', 'T') + 'Z' : row.createdAt)
      }));
      res.json(formattedPosts);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.post("/api/posts", (req, res) => {
    const { id, authorId, authorName, authorPhoto, content, imageUrl, hashtags, poll } = req.body;
    const createdAt = new Date().toISOString();
    try {
      db.prepare("INSERT INTO posts (id, authorId, authorName, authorPhoto, content, imageUrl, hashtags, poll, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(id, authorId, authorName, authorPhoto, content, imageUrl, JSON.stringify(hashtags || []), poll ? JSON.stringify(poll) : null, createdAt);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  app.post("/api/posts/:postId/poll/vote", (req, res) => {
    const { postId } = req.params;
    const { userId, optionId } = req.body;

    try {
      const post = db.prepare("SELECT poll FROM posts WHERE id = ?").get(postId) as any;
      if (!post || !post.poll) {
        return res.status(404).json({ error: "Poll not found" });
      }

      const poll = JSON.parse(post.poll);
      
      // Remove user's previous vote if any
      poll.options.forEach((opt: any) => {
        opt.votes = opt.votes.filter((uid: string) => uid !== userId);
      });

      // Add new vote
      const option = poll.options.find((opt: any) => opt.id === optionId);
      if (option) {
        if (!option.votes) option.votes = [];
        option.votes.push(userId);
      }

      db.prepare("UPDATE posts SET poll = ? WHERE id = ?").run(JSON.stringify(poll), postId);
      res.json({ success: true, poll });
    } catch (error) {
      console.error("Poll vote error:", error);
      res.status(500).json({ error: "Failed to vote" });
    }
  });

  app.get("/api/posts/hashtag/:hashtag", (req, res) => {
    const { hashtag } = req.params;
    try {
      const posts = db.prepare("SELECT * FROM posts WHERE hashtags LIKE ? ORDER BY createdAt DESC")
        .all(`%\"${hashtag}\"%`);
      
      const formattedPosts = posts.map((row: any) => ({
        ...row,
        hashtags: JSON.parse(row.hashtags || "[]"),
        poll: row.poll ? JSON.parse(row.poll) : null,
        createdAt: row.createdAt.includes('Z') ? row.createdAt : (row.createdAt.includes(' ') ? row.createdAt.replace(' ', 'T') + 'Z' : row.createdAt)
      }));
      res.json(formattedPosts);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch hashtag posts" });
    }
  });

  app.get("/api/users", (req, res) => {
    try {
      const users = db.prepare("SELECT * FROM users LIMIT 100").all();
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.delete("/api/posts/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM posts WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete post" });
    }
  });

  // Ads API
  app.get("/api/ads", (req, res) => {
    try {
      const ads = db.prepare("SELECT * FROM ads WHERE active = 1 ORDER BY createdAt DESC").all();
      res.json(ads);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch ads" });
    }
  });

  app.post("/api/ads", (req, res) => {
    const { userId, ad } = req.body;
    // Admin check
    const user = db.prepare("SELECT email FROM users WHERE id = ?").get(userId) as any;
    if (!user || user.email !== "gopinathmanjula7@gmail.com") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { id, title, description, imageUrl, ctaText, ctaUrl, type } = ad;
    try {
      db.prepare(`
        INSERT INTO ads (id, title, description, imageUrl, ctaText, ctaUrl, type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, title, description, imageUrl, ctaText, ctaUrl, type || 'feed');
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to create ad" });
    }
  });

  app.delete("/api/ads/:id", (req, res) => {
    const { id } = req.params;
    const { userId } = req.query;
    // Admin check
    const user = db.prepare("SELECT email FROM users WHERE id = ?").get(userId) as any;
    if (!user || user.email !== "gopinathmanjula7@gmail.com") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      db.prepare("DELETE FROM ads WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete ad" });
    }
  });

  app.patch("/api/ads/:id/toggle", (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    // Admin check
    const user = db.prepare("SELECT email FROM users WHERE id = ?").get(userId) as any;
    if (!user || user.email !== "gopinathmanjula7@gmail.com") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      db.prepare("UPDATE ads SET active = 1 - active WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to toggle ad status" });
    }
  });

  app.get("/api/users/:id", (req, res) => {
    try {
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
      res.json(user || null);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/users", (req, res) => {
    const { id, displayName, photoURL, email, bio, theme } = req.body;
    try {
      const existing = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
      if (existing) {
        db.prepare("UPDATE users SET displayName = ?, photoURL = ?, bio = ?, theme = ? WHERE id = ?")
          .run(displayName, photoURL, bio, theme || 'light', id);
      } else {
        db.prepare("INSERT INTO users (id, displayName, photoURL, email, bio, theme) VALUES (?, ?, ?, ?, ?, ?)")
          .run(id, displayName, photoURL, email, bio, theme || 'light');
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to sync user" });
    }
  });

  app.post("/api/likes", (req, res) => {
    const { id, postId, userId } = req.body;
    const runTransaction = db.transaction(() => {
      db.prepare("INSERT INTO likes (id, postId, userId) VALUES (?, ?, ?)").run(id, postId, userId);
      db.prepare("UPDATE posts SET likesCount = likesCount + 1 WHERE id = ?").run(postId);
    });
    
    try {
      runTransaction();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to like post" });
    }
  });

  // Database Backup & Restore
  const isAdmin = (userId: string) => {
    const user = db.prepare("SELECT email FROM users WHERE id = ?").get(userId) as any;
    return user && user.email === "gopinathmanjula7@gmail.com";
  };

  app.get("/api/admin/export", (req, res) => {
    const { userId } = req.query;
    if (!userId || !isAdmin(userId as string)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const users = db.prepare("SELECT * FROM users").all();
      const posts = db.prepare("SELECT * FROM posts").all();
      const likes = db.prepare("SELECT * FROM likes").all();
      const bookmarks = db.prepare("SELECT * FROM bookmarks").all();
      const chats = db.prepare("SELECT * FROM chats").all();
      const chat_participants = db.prepare("SELECT * FROM chat_participants").all();
      const messages = db.prepare("SELECT * FROM messages").all();
      const notifications = db.prepare("SELECT * FROM notifications").all();
      
      res.json({
        version: "1.0",
        timestamp: new Date().toISOString(),
        data: {
          users,
          posts,
          likes,
          bookmarks,
          chats,
          chat_participants,
          messages,
          notifications
        }
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to export database" });
    }
  });

  app.post("/api/admin/import", (req, res) => {
    const { data, userId } = req.body;
    if (!userId || !isAdmin(userId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    if (!data) return res.status(400).json({ error: "No data provided" });

    const runImport = db.transaction(() => {
      // Clear existing data (optional, but safer for a full restore)
      db.prepare("DELETE FROM notifications").run();
      db.prepare("DELETE FROM messages").run();
      db.prepare("DELETE FROM chat_participants").run();
      db.prepare("DELETE FROM chats").run();
      db.prepare("DELETE FROM bookmarks").run();
      db.prepare("DELETE FROM likes").run();
      db.prepare("DELETE FROM posts").run();
      db.prepare("DELETE FROM users").run();

      // Insert new data
      if (data.users) {
        const insert = db.prepare("INSERT INTO users (id, displayName, photoURL, email, bio, theme) VALUES (?, ?, ?, ?, ?, ?)");
        data.users.forEach((u: any) => insert.run(u.id, u.displayName, u.photoURL, u.email, u.bio, u.theme || 'light'));
      }
      if (data.posts) {
        const insert = db.prepare("INSERT INTO posts (id, authorId, authorName, authorPhoto, content, imageUrl, hashtags, poll, createdAt, likesCount, commentsCount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        data.posts.forEach((p: any) => insert.run(p.id, p.authorId, p.authorName, p.authorPhoto, p.content, p.imageUrl, p.hashtags, p.poll, p.createdAt, p.likesCount, p.commentsCount));
      }
      if (data.likes) {
        const insert = db.prepare("INSERT INTO likes (id, postId, userId) VALUES (?, ?, ?)");
        data.likes.forEach((l: any) => insert.run(l.id, l.postId, l.userId));
      }
      if (data.bookmarks) {
        const insert = db.prepare("INSERT INTO bookmarks (id, userId, postId, createdAt) VALUES (?, ?, ?, ?)");
        data.bookmarks.forEach((b: any) => insert.run(b.id, b.userId, b.postId, b.createdAt));
      }
      if (data.chats) {
        const insert = db.prepare("INSERT INTO chats (id, createdAt) VALUES (?, ?)");
        data.chats.forEach((c: any) => insert.run(c.id, c.createdAt));
      }
      if (data.chat_participants) {
        const insert = db.prepare("INSERT INTO chat_participants (chatId, userId) VALUES (?, ?)");
        data.chat_participants.forEach((cp: any) => insert.run(cp.chatId, cp.userId));
      }
      if (data.messages) {
        const insert = db.prepare("INSERT INTO messages (id, chatId, senderId, text, createdAt) VALUES (?, ?, ?, ?, ?)");
        data.messages.forEach((m: any) => insert.run(m.id, m.chatId, m.senderId, m.text, m.createdAt));
      }
      if (data.notifications) {
        const insert = db.prepare("INSERT INTO notifications (id, userId, type, fromId, fromName, fromPhoto, postId, read, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        data.notifications.forEach((n: any) => insert.run(n.id, n.userId, n.type, n.fromId, n.fromName, n.fromPhoto, n.postId, n.read, n.createdAt));
      }
    });

    try {
      runImport();
      res.json({ success: true });
    } catch (err) {
      console.error("Import error:", err);
      res.status(500).json({ error: "Failed to import database" });
    }
  });

  app.delete("/api/likes", (req, res) => {
    const postId = req.query.postId as string;
    const userId = req.query.userId as string;
    const runTransaction = db.transaction(() => {
      db.prepare("DELETE FROM likes WHERE postId = ? AND userId = ?").run(postId, userId);
      db.prepare("UPDATE posts SET likesCount = likesCount - 1 WHERE id = ?").run(postId);
    });

    try {
      runTransaction();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to unlike post" });
    }
  });

  app.get("/api/notifications/:userId", (req, res) => {
    try {
      const notifications = db.prepare("SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50")
        .all(req.params.userId);
      res.json(notifications);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications", (req, res) => {
    const { id, userId, type, fromId, fromName, fromPhoto, postId } = req.body;
    try {
      db.prepare("INSERT INTO notifications (id, userId, type, fromId, fromName, fromPhoto, postId) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(id, userId, type, fromId, fromName, fromPhoto, postId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to create notification" });
    }
  });

  app.get("/api/chats/:userId", (req, res) => {
    try {
      const chats = db.prepare(`
        SELECT c.*, GROUP_CONCAT(cp.userId) as participants
        FROM chats c
        JOIN chat_participants cp ON c.id = cp.chatId
        WHERE c.id IN (SELECT chatId FROM chat_participants WHERE userId = ?)
        GROUP BY c.id
        ORDER BY c.lastMessageAt DESC
      `).all(req.params.userId);
      
      const formattedChats = chats.map((row: any) => ({
        ...row,
        participants: (row.participants as string).split(',')
      }));
      res.json(formattedChats);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch chats" });
    }
  });

  app.get("/api/messages/:chatId", (req, res) => {
    try {
      const messages = db.prepare("SELECT * FROM messages WHERE chatId = ? ORDER BY createdAt ASC")
        .all(req.params.chatId);
      res.json(messages);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", (req, res) => {
    const { id, chatId, senderId, text } = req.body;
    const runTransaction = db.transaction(() => {
      db.prepare("INSERT INTO messages (id, chatId, senderId, text) VALUES (?, ?, ?, ?)").run(id, chatId, senderId, text);
      db.prepare("UPDATE chats SET lastMessageAt = CURRENT_TIMESTAMP WHERE id = ?").run(chatId);
    });

    try {
      runTransaction();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.post("/api/chats", (req, res) => {
    const { id, participants } = req.body;
    const runTransaction = db.transaction(() => {
      db.prepare("INSERT INTO chats (id, lastMessageAt) VALUES (?, CURRENT_TIMESTAMP)").run(id);
      const insertParticipant = db.prepare("INSERT INTO chat_participants (chatId, userId) VALUES (?, ?)");
      for (const userId of participants) {
        insertParticipant.run(id, userId);
      }
    });

    try {
      runTransaction();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to create chat" });
    }
  });

  app.get("/api/bookmarks/:userId", (req, res) => {
    const { userId } = req.params;
    try {
      const bookmarks = db.prepare(`
        SELECT p.*, u.displayName as authorName, u.photoURL as authorPhoto 
        FROM posts p 
        JOIN bookmarks b ON p.id = b.postId 
        JOIN users u ON p.authorId = u.id 
        WHERE b.userId = ? 
        ORDER BY b.createdAt DESC
      `).all(userId);
      res.json(bookmarks);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch bookmarks" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
