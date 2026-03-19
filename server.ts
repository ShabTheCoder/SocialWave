import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initDb() {
  try {
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        displayName TEXT,
        photoURL TEXT,
        email TEXT,
        bio TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await turso.execute(`
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
    await turso.execute(`
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
    await turso.execute(`
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
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        lastMessageAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        unreadCount TEXT
      )
    `);
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS chat_participants (
        chatId TEXT,
        userId TEXT,
        PRIMARY KEY (chatId, userId),
        FOREIGN KEY (chatId) REFERENCES chats(id),
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chatId TEXT,
        senderId TEXT,
        text TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chatId) REFERENCES chats(id)
      )
    `);
    await turso.execute(`
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
    console.log("Turso DB initialized");
  } catch (err) {
    console.error("Failed to initialize Turso DB:", err);
  }
}

async function startServer() {
  await initDb();
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // API Routes
  app.get("/api/posts", async (req, res) => {
    const { authorId } = req.query;
    try {
      let sql = "SELECT * FROM posts ORDER BY createdAt DESC LIMIT 50";
      let args: any[] = [];
      if (authorId) {
        sql = "SELECT * FROM posts WHERE authorId = ? ORDER BY createdAt DESC LIMIT 50";
        args = [authorId];
      }
      const result = await turso.execute({ sql, args });
      const posts = result.rows.map(row => ({
        ...row,
        hashtags: JSON.parse(row.hashtags as string || "[]")
      }));
      res.json(posts);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.post("/api/posts", async (req, res) => {
    const { id, authorId, authorName, authorPhoto, content, imageUrl, hashtags } = req.body;
    try {
      await turso.execute({
        sql: "INSERT INTO posts (id, authorId, authorName, authorPhoto, content, imageUrl, hashtags) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [id, authorId, authorName, authorPhoto, content, imageUrl, JSON.stringify(hashtags || [])]
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  app.get("/api/posts/hashtag/:hashtag", async (req, res) => {
    const { hashtag } = req.params;
    try {
      const result = await turso.execute({
        sql: "SELECT * FROM posts WHERE hashtags LIKE ? ORDER BY createdAt DESC",
        args: [`%\"${hashtag}\"%`]
      });
      const posts = result.rows.map(row => ({
        ...row,
        hashtags: JSON.parse(row.hashtags as string || "[]")
      }));
      res.json(posts);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch hashtag posts" });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const result = await turso.execute("SELECT * FROM users LIMIT 100");
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const result = await turso.execute({
        sql: "SELECT * FROM users WHERE id = ?",
        args: [req.params.id]
      });
      res.json(result.rows[0] || null);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    const { id, displayName, photoURL, email, bio } = req.body;
    try {
      await turso.execute({
        sql: "INSERT INTO users (id, displayName, photoURL, email, bio) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET displayName=excluded.displayName, photoURL=excluded.photoURL, bio=excluded.bio",
        args: [id, displayName, photoURL, email, bio]
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to sync user" });
    }
  });

  app.post("/api/likes", async (req, res) => {
    const { id, postId, userId } = req.body;
    const tx = await turso.transaction("write");
    try {
      await tx.execute({
        sql: "INSERT INTO likes (id, postId, userId) VALUES (?, ?, ?)",
        args: [id, postId, userId]
      });
      await tx.execute({
        sql: "UPDATE posts SET likesCount = likesCount + 1 WHERE id = ?",
        args: [postId]
      });
      await tx.commit();
      res.json({ success: true });
    } catch (err) {
      await tx.rollback();
      res.status(500).json({ error: "Failed to like post" });
    } finally {
      tx.close();
    }
  });

  app.delete("/api/likes", async (req, res) => {
    const postId = req.query.postId as string;
    const userId = req.query.userId as string;
    const tx = await turso.transaction("write");
    try {
      await tx.execute({
        sql: "DELETE FROM likes WHERE postId = ? AND userId = ?",
        args: [postId, userId]
      });
      await tx.execute({
        sql: "UPDATE posts SET likesCount = likesCount - 1 WHERE id = ?",
        args: [postId]
      });
      await tx.commit();
      res.json({ success: true });
    } catch (err) {
      await tx.rollback();
      res.status(500).json({ error: "Failed to unlike post" });
    } finally {
      tx.close();
    }
  });

  app.get("/api/notifications/:userId", async (req, res) => {
    try {
      const result = await turso.execute({
        sql: "SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50",
        args: [req.params.userId]
      });
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    const { id, userId, type, fromId, fromName, fromPhoto, postId } = req.body;
    try {
      await turso.execute({
        sql: "INSERT INTO notifications (id, userId, type, fromId, fromName, fromPhoto, postId) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [id, userId, type, fromId, fromName, fromPhoto, postId]
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to create notification" });
    }
  });

  app.get("/api/chats/:userId", async (req, res) => {
    try {
      const result = await turso.execute({
        sql: `
          SELECT c.*, GROUP_CONCAT(cp.userId) as participants
          FROM chats c
          JOIN chat_participants cp ON c.id = cp.chatId
          WHERE c.id IN (SELECT chatId FROM chat_participants WHERE userId = ?)
          GROUP BY c.id
          ORDER BY c.lastMessageAt DESC
        `,
        args: [req.params.userId]
      });
      const chats = result.rows.map(row => ({
        ...row,
        participants: (row.participants as string).split(',')
      }));
      res.json(chats);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch chats" });
    }
  });

  app.get("/api/messages/:chatId", async (req, res) => {
    try {
      const result = await turso.execute({
        sql: "SELECT * FROM messages WHERE chatId = ? ORDER BY createdAt ASC",
        args: [req.params.chatId]
      });
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    const { id, chatId, senderId, text } = req.body;
    const tx = await turso.transaction("write");
    try {
      await tx.execute({
        sql: "INSERT INTO messages (id, chatId, senderId, text) VALUES (?, ?, ?, ?)",
        args: [id, chatId, senderId, text]
      });
      await tx.execute({
        sql: "UPDATE chats SET lastMessageAt = CURRENT_TIMESTAMP WHERE id = ?",
        args: [chatId]
      });
      await tx.commit();
      res.json({ success: true });
    } catch (err) {
      await tx.rollback();
      res.status(500).json({ error: "Failed to send message" });
    } finally {
      tx.close();
    }
  });

  app.post("/api/chats", async (req, res) => {
    const { id, participants, isGroup, name, groupAvatar } = req.body;
    const tx = await turso.transaction("write");
    try {
      await tx.execute({
        sql: "INSERT INTO chats (id, lastMessageAt) VALUES (?, CURRENT_TIMESTAMP)",
        args: [id]
      });
      for (const userId of participants) {
        await tx.execute({
          sql: "INSERT INTO chat_participants (chatId, userId) VALUES (?, ?)",
          args: [id, userId]
        });
      }
      await tx.commit();
      res.json({ success: true });
    } catch (err) {
      await tx.rollback();
      res.status(500).json({ error: "Failed to create chat" });
    } finally {
      tx.close();
    }
  });

  app.get("/api/bookmarks/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
      const result = await turso.execute({
        sql: `
          SELECT p.*, u.displayName as authorName, u.photoURL as authorPhoto 
          FROM posts p 
          JOIN bookmarks b ON p.id = b.postId 
          JOIN users u ON p.authorId = u.id 
          WHERE b.userId = ? 
          ORDER BY b.createdAt DESC
        `,
        args: [userId]
      });
      res.json(result.rows);
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
