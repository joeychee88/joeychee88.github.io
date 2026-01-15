import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, '../data/users.json');

// User roles
export const UserRole = {
  SYSTEM_ADMIN: 'system_admin',
  SALES_PERSON: 'sales_person',
  CLIENT_ADMIN: 'client_admin',
  CLIENT_USER: 'client_user'
};

// User status
export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending'
};

class User {
  constructor() {
    this.ensureDataFile();
  }

  async ensureDataFile() {
    try {
      await fs.access(USERS_FILE);
    } catch {
      await fs.writeFile(USERS_FILE, JSON.stringify([], null, 2));
    }
  }

  async getAll() {
    try {
      const data = await fs.readFile(USERS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading users:', error);
      return [];
    }
  }

  async getById(id) {
    const users = await this.getAll();
    // Handle both string and numeric IDs
    return users.find(u => u.id == id || u.id === id);
  }

  async getByEmail(email) {
    const users = await this.getAll();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  async getByOrganization(organizationId) {
    const users = await this.getAll();
    return users.filter(u => u.organizationId === organizationId);
  }

  async getBySalesPerson(salesPersonId) {
    const users = await this.getAll();
    return users.filter(u => u.assignedSalesPersonId === salesPersonId);
  }

  async create(userData) {
    const users = await this.getAll();
    
    // Check if email already exists
    const existingUser = users.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
    if (existingUser) {
      throw new Error('Email already exists');
    }

    const newUser = {
      id: `user_${crypto.randomBytes(8).toString('hex')}`,
      email: userData.email.toLowerCase(),
      name: userData.name,
      password: userData.password || 'kult2024', // Store password (in production, hash this!)
      phone: userData.phone || '',
      role: userData.role || UserRole.CLIENT_USER,
      organizationId: userData.organizationId || null,
      assignedSalesPersonId: userData.assignedSalesPersonId || null,
      status: userData.status || UserStatus.ACTIVE,
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
      metadata: {
        jobTitle: userData.jobTitle || '',
        department: userData.department || ''
      }
    };

    users.push(newUser);
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    
    return newUser;
  }

  async update(id, updates) {
    const users = await this.getAll();
    // Handle both string and numeric IDs
    const index = users.findIndex(u => u.id == id || u.id === id);
    
    if (index === -1) {
      throw new Error('User not found');
    }

    // Merge updates
    users[index] = {
      ...users[index],
      ...updates,
      id: users[index].id, // Preserve ID
      email: users[index].email, // Preserve email
      createdAt: users[index].createdAt, // Preserve creation date
      updatedAt: new Date().toISOString()
    };

    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    
    return users[index];
  }

  async updateLastLogin(id) {
    return this.update(id, {
      lastLoginAt: new Date().toISOString()
    });
  }

  async delete(id) {
    const users = await this.getAll();
    const filtered = users.filter(u => u.id !== id);
    
    if (filtered.length === users.length) {
      throw new Error('User not found');
    }

    await fs.writeFile(USERS_FILE, JSON.stringify(filtered, null, 2));
    
    return true;
  }

  // Promote user to client admin
  async promoteToClientAdmin(userId) {
    return this.update(userId, {
      role: UserRole.CLIENT_ADMIN
    });
  }

  // Get all client admins
  async getClientAdmins() {
    const users = await this.getAll();
    return users.filter(u => u.role === UserRole.CLIENT_ADMIN);
  }

  // Get all sales people
  async getSalesPeople() {
    const users = await this.getAll();
    return users.filter(u => u.role === UserRole.SALES_PERSON);
  }
}

export default new User();
