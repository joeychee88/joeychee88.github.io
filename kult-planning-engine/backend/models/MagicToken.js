import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKENS_FILE = path.join(__dirname, '../data/magic_tokens.json');

class MagicToken {
  constructor() {
    this.ensureDataFile();
  }

  async ensureDataFile() {
    try {
      await fs.access(TOKENS_FILE);
    } catch {
      await fs.writeFile(TOKENS_FILE, JSON.stringify([], null, 2));
    }
  }

  async getAll() {
    try {
      const data = await fs.readFile(TOKENS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading tokens:', error);
      return [];
    }
  }

  async getByToken(token) {
    const tokens = await this.getAll();
    return tokens.find(t => t.token === token);
  }

  async getByUserId(userId) {
    const tokens = await this.getAll();
    return tokens.filter(t => t.userId === userId);
  }

  // Generate a secure magic link token
  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Create a new magic link token
  async create(userId, metadata = {}) {
    const tokens = await this.getAll();
    
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes expiry

    const newToken = {
      id: `token_${crypto.randomBytes(8).toString('hex')}`,
      userId,
      token,
      expiresAt: expiresAt.toISOString(),
      used: false,
      usedAt: null,
      ipAddress: metadata.ipAddress || null,
      userAgent: metadata.userAgent || null,
      createdAt: new Date().toISOString()
    };

    tokens.push(newToken);
    await fs.writeFile(TOKENS_FILE, JSON.stringify(tokens, null, 2));
    
    return newToken;
  }

  // Verify and mark token as used
  async verify(token) {
    const tokens = await this.getAll();
    const index = tokens.findIndex(t => t.token === token);
    
    if (index === -1) {
      return { valid: false, error: 'Invalid token' };
    }

    const tokenData = tokens[index];

    // Check if already used
    if (tokenData.used) {
      return { valid: false, error: 'Token already used' };
    }

    // Check if expired
    if (new Date(tokenData.expiresAt) < new Date()) {
      return { valid: false, error: 'Token expired' };
    }

    // Mark as used
    tokens[index].used = true;
    tokens[index].usedAt = new Date().toISOString();
    await fs.writeFile(TOKENS_FILE, JSON.stringify(tokens, null, 2));

    return { 
      valid: true, 
      userId: tokenData.userId,
      token: tokenData
    };
  }

  // Clean up expired tokens (run periodically)
  async cleanupExpired() {
    const tokens = await this.getAll();
    const now = new Date();
    
    const active = tokens.filter(t => {
      const expiresAt = new Date(t.expiresAt);
      // Keep tokens that are not expired or were used in last 24 hours
      if (!t.used) {
        return expiresAt > now;
      }
      const usedAt = new Date(t.usedAt);
      const hoursSinceUsed = (now - usedAt) / (1000 * 60 * 60);
      return hoursSinceUsed < 24;
    });

    await fs.writeFile(TOKENS_FILE, JSON.stringify(active, null, 2));
    
    return {
      before: tokens.length,
      after: active.length,
      cleaned: tokens.length - active.length
    };
  }

  // Invalidate all tokens for a user
  async invalidateUserTokens(userId) {
    const tokens = await this.getAll();
    const updated = tokens.map(t => {
      if (t.userId === userId && !t.used) {
        return { ...t, used: true, usedAt: new Date().toISOString() };
      }
      return t;
    });

    await fs.writeFile(TOKENS_FILE, JSON.stringify(updated, null, 2));
    return true;
  }
}

export default new MagicToken();
