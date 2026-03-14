import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import { getDb } from '../db/connection.js';

const JWT_SECRET = config.encryptionKey || 'fallback_secret_for_dev_only';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        role: string;
      };
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    return;
  }

  const token = authHeader.slice(7);

  if (token.startsWith('gsm_')) {
    try {
      const db = getDb();
      const tokens = db.prepare('SELECT * FROM api_tokens WHERE expires_at IS NULL OR expires_at > datetime(\'now\')').all() as any[];
      
      let matchedToken = null;
      for (const t of tokens) {
        if (await bcrypt.compare(token, t.token_hash)) {
          matchedToken = t;
          break;
        }
      }

      if (!matchedToken) {
        res.status(401).json({ error: 'Invalid API token', code: 'UNAUTHORIZED' });
        return;
      }

      const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(matchedToken.user_id) as any;
      if (!user) {
        res.status(401).json({ error: 'User not found', code: 'UNAUTHORIZED' });
        return;
      }

      db.prepare('UPDATE api_tokens SET last_used_at = datetime(\'now\') WHERE id = ?').run(matchedToken.id);

      req.user = {
        id: user.id,
        username: user.username,
        role: user.role
      };
      next();
    } catch (err) {
      console.error('API token validation error:', err);
      res.status(401).json({ error: 'Invalid API token', code: 'UNAUTHORIZED' });
    }
  } else {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role
      };
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token', code: 'UNAUTHORIZED' });
    }
  }
}
