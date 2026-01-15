import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ORGANIZATIONS_FILE = path.join(__dirname, '../data/organizations.json');

// Organization status
export const OrganizationStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
};

class Organization {
  constructor() {
    this.ensureDataFile();
  }

  async ensureDataFile() {
    try {
      await fs.access(ORGANIZATIONS_FILE);
    } catch {
      await fs.writeFile(ORGANIZATIONS_FILE, JSON.stringify([], null, 2));
    }
  }

  async getAll() {
    try {
      const data = await fs.readFile(ORGANIZATIONS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading organizations:', error);
      return [];
    }
  }

  async getById(id) {
    const organizations = await this.getAll();
    return organizations.find(o => o.id === id);
  }

  async getByName(name) {
    const organizations = await this.getAll();
    return organizations.find(o => o.name.toLowerCase() === name.toLowerCase());
  }

  async getBySalesPerson(salesPersonId) {
    const organizations = await this.getAll();
    return organizations.filter(o => o.assignedSalesPersonId === salesPersonId);
  }

  async create(orgData) {
    const organizations = await this.getAll();
    
    // Check if organization name already exists
    const existing = organizations.find(o => o.name.toLowerCase() === orgData.name.toLowerCase());
    if (existing) {
      throw new Error('Organization name already exists');
    }

    const newOrg = {
      id: `org_${crypto.randomBytes(8).toString('hex')}`,
      name: orgData.name,
      industry: orgData.industry || '',
      adminUserId: orgData.adminUserId || null,
      assignedSalesPersonId: orgData.assignedSalesPersonId || null,
      teamMembers: orgData.teamMembers || [],
      status: orgData.status || OrganizationStatus.ACTIVE,
      createdAt: new Date().toISOString(),
      metadata: {
        address: orgData.address || '',
        website: orgData.website || '',
        notes: orgData.notes || ''
      }
    };

    organizations.push(newOrg);
    await fs.writeFile(ORGANIZATIONS_FILE, JSON.stringify(organizations, null, 2));
    
    return newOrg;
  }

  async update(id, updates) {
    const organizations = await this.getAll();
    const index = organizations.findIndex(o => o.id === id);
    
    if (index === -1) {
      throw new Error('Organization not found');
    }

    // Merge updates
    organizations[index] = {
      ...organizations[index],
      ...updates,
      id: organizations[index].id, // Preserve ID
      createdAt: organizations[index].createdAt, // Preserve creation date
      updatedAt: new Date().toISOString()
    };

    await fs.writeFile(ORGANIZATIONS_FILE, JSON.stringify(organizations, null, 2));
    
    return organizations[index];
  }

  async addTeamMember(organizationId, userId) {
    const org = await this.getById(organizationId);
    if (!org) {
      throw new Error('Organization not found');
    }

    if (!org.teamMembers.includes(userId)) {
      org.teamMembers.push(userId);
      return this.update(organizationId, { teamMembers: org.teamMembers });
    }

    return org;
  }

  async removeTeamMember(organizationId, userId) {
    const org = await this.getById(organizationId);
    if (!org) {
      throw new Error('Organization not found');
    }

    org.teamMembers = org.teamMembers.filter(id => id !== userId);
    return this.update(organizationId, { teamMembers: org.teamMembers });
  }

  async setAdmin(organizationId, userId) {
    return this.update(organizationId, { adminUserId: userId });
  }

  async delete(id) {
    const organizations = await this.getAll();
    const filtered = organizations.filter(o => o.id !== id);
    
    if (filtered.length === organizations.length) {
      throw new Error('Organization not found');
    }

    await fs.writeFile(ORGANIZATIONS_FILE, JSON.stringify(filtered, null, 2));
    
    return true;
  }
}

export default new Organization();
