import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

function generateToken(): string {
  return `gsm_${crypto.randomBytes(32).toString('hex')}`;
}

router.get('/api/tokens', authMiddleware, (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    const tokens = db.prepare(`
      SELECT id, name, permissions, last_used_at, expires_at, created_at 
      FROM api_tokens 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);

    res.json(tokens);
  } catch (err) {
    console.error('Failed to get tokens:', err);
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

router.post('/api/tokens', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, permissions = 'read', expires_in_days } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Token name is required', code: 'MISSING_NAME' });
    }

    const validPermissions = ['read', 'write', 'admin'];
    if (!validPermissions.includes(permissions)) {
      return res.status(400).json({ error: 'Invalid permissions', code: 'INVALID_PERMISSIONS' });
    }

    const db = getDb();
    
    const tokenCount = db.prepare('SELECT COUNT(*) as count FROM api_tokens WHERE user_id = ?').get(userId) as { count: number };
    if (tokenCount.count >= 10) {
      return res.status(400).json({ error: 'Maximum 10 tokens per user', code: 'TOKEN_LIMIT_REACHED' });
    }

    const rawToken = generateToken();
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const tokenId = crypto.randomUUID();

    let expiresAt = null;
    if (expires_in_days) {
      const expiresDate = new Date();
      expiresDate.setDate(expiresDate.getDate() + expires_in_days);
      expiresAt = expiresDate.toISOString();
    }

    db.prepare(`
      INSERT INTO api_tokens (id, user_id, name, token_hash, permissions, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(tokenId, userId, name, tokenHash, permissions, expiresAt);

    res.status(201).json({
      id: tokenId,
      name,
      permissions,
      token: rawToken,
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to create token:', err);
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

router.delete('/api/tokens/:id', authMiddleware, (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const tokenId = req.params.id;
    const db = getDb();

    const result = db.prepare('DELETE FROM api_tokens WHERE id = ? AND user_id = ?').run(tokenId, userId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Token not found', code: 'TOKEN_NOT_FOUND' });
    }

    res.json({ message: 'Token deleted successfully' });
  } catch (err) {
    console.error('Failed to delete token:', err);
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

export default router;
