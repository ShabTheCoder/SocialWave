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
      console.log("Added 'theme' column to 'users' table");
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
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        likesCount INTEGER DEFAULT 0,
        commentsCount INTEGER DEFAULT 0,
        FOREIGN KEY (authorId) REFERENCES users(id)
      )
    `);

    // Migration: Add likesCount and commentsCount to posts if they don't exist
    const postTableInfo = db.prepare("PRAGMA table_info(posts)").all();
    if (!postTableInfo.some((col: any) => col.name === 'likesCount')) {
      db.exec("ALTER TABLE posts ADD COLUMN likesCount INTEGER DEFAULT 0");
      console.log("Added 'likesCount' column to 'posts' table");
    }
    if (!postTableInfo.some((col: any) => col.name === 'commentsCount')) {
      db.exec("ALTER TABLE posts ADD COLUMN commentsCount INTEGER DEFAULT 0");
      console.log("Added 'commentsCount' column to 'posts' table");
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
        hashtags: JSON.parse(row.hashtags || "[]")
      }));
      res.json(formattedPosts);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.post("/api/posts", (req, res) => {
    const { id, authorId, authorName, authorPhoto, content, imageUrl, hashtags } = req.body;
    try {
      db.prepare("INSERT INTO posts (id, authorId, authorName, authorPhoto, content, imageUrl, hashtags) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(id, authorId, authorName, authorPhoto, content, imageUrl, JSON.stringify(hashtags || []));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  app.get("/api/posts/hashtag/:hashtag", (req, res) => {
    const { hashtag } = req.params;
    try {
      const posts = db.prepare("SELECT * FROM posts WHERE hashtags LIKE ? ORDER BY createdAt DESC")
        .all(`%\"${hashtag}\"%`);
      
      const formattedPosts = posts.map((row: any) => ({
        ...row,
        hashtags: JSON.parse(row.hashtags || "[]")
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
      console.error("Error deleting post:", error);
      res.status(500).json({ error: "Failed to delete post" });
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
      console.error("Sync user error:", err);
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
