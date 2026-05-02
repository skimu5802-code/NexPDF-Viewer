import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Database
const db = new Database('pdf_annotations.db');
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS annotations (
    id TEXT PRIMARY KEY,
    fileId TEXT NOT NULL,
    page INTEGER NOT NULL,
    type TEXT NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    width REAL,
    height REAL,
    color TEXT,
    text TEXT,
    author TEXT,
    path TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Migration: Add 'path' column if it doesn't exist
try {
  const tableInfo = db.prepare("PRAGMA table_info(annotations)").all();
  const hasPathColumn = (tableInfo as any[]).some(col => col.name === 'path');
  if (!hasPathColumn) {
    db.exec("ALTER TABLE annotations ADD COLUMN path TEXT");
    console.log("Migration: Added 'path' column to annotations table");
  }
} catch (e) {
  console.error("Migration error:", e);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get('/api/annotations/:fileId', (req, res) => {
    try {
      const { fileId } = req.params;
      const stmt = db.prepare('SELECT * FROM annotations WHERE fileId = ? ORDER BY createdAt ASC');
      const annotations = stmt.all(fileId);
      
      const formattedAnnotations = annotations.map((ann: any) => ({
        ...ann,
        path: ann.path ? JSON.parse(ann.path) : null
      }));
      
      res.json(formattedAnnotations);
    } catch (error) {
      console.error('Fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch annotations' });
    }
  });

  app.post('/api/annotations', (req, res) => {
    try {
      const { id, fileId, page, type, x, y, width, height, color, text, author, path: drawingPath } = req.body;
      const stmt = db.prepare(`
        INSERT INTO annotations (id, fileId, page, type, x, y, width, height, color, text, author, path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, fileId, page, type, x, y, width, height, color, text, author, drawingPath ? JSON.stringify(drawingPath) : null);
      res.status(201).json({ success: true });
    } catch (error) {
      console.error('Save error:', error);
      res.status(500).json({ error: 'Failed to save annotation' });
    }
  });

  app.patch('/api/annotations/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { text } = req.body;
      const stmt = db.prepare('UPDATE annotations SET text = ? WHERE id = ?');
      stmt.run(text, id);
      res.json({ success: true });
    } catch (error) {
      console.error('Update error:', error);
      res.status(500).json({ error: 'Failed to update annotation' });
    }
  });

  app.delete('/api/annotations/:id', (req, res) => {
    try {
      const { id } = req.params;
      const stmt = db.prepare('DELETE FROM annotations WHERE id = ?');
      stmt.run(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({ error: 'Failed to delete annotation' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
