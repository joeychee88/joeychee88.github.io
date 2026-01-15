import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SALESPEOPLE_FILE = path.join(__dirname, '../data/salespeople.json');

// Sales person status
export const SalesPersonStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
};

class SalesPerson {
  constructor() {
    this.ensureDataFile();
  }

  async ensureDataFile() {
    try {
      await fs.access(SALESPEOPLE_FILE);
    } catch {
      // Create default sales people
      const defaultSalesPeople = [
        {
          id: 'sales_default_001',
          name: 'Sarah Johnson',
          email: 'sarah@kult.my',
          phone: '+60123456789',
          department: 'FMCG & Retail',
          territory: 'Klang Valley',
          industries: ['fmcg', 'beauty', 'retail_ecommerce', 'f_and_b'],
          assignedOrganizations: [],
          activeClientsCount: 0,
          status: SalesPersonStatus.ACTIVE,
          createdAt: new Date().toISOString()
        },
        {
          id: 'sales_default_002',
          name: 'Kevin Tan',
          email: 'kevin@kult.my',
          phone: '+60123456790',
          department: 'Automotive & Tech',
          territory: 'Nationwide',
          industries: ['automotive_ice', 'automotive_ev', 'tech_devices', 'gaming'],
          assignedOrganizations: [],
          activeClientsCount: 0,
          status: SalesPersonStatus.ACTIVE,
          createdAt: new Date().toISOString()
        },
        {
          id: 'sales_default_003',
          name: 'Michelle Lee',
          email: 'michelle@kult.my',
          phone: '+60123456791',
          department: 'Finance & Property',
          territory: 'Central Region',
          industries: ['banking_fintech', 'finance_insurance', 'property_luxury', 'property_mid_range'],
          assignedOrganizations: [],
          activeClientsCount: 0,
          status: SalesPersonStatus.ACTIVE,
          createdAt: new Date().toISOString()
        }
      ];
      await fs.writeFile(SALESPEOPLE_FILE, JSON.stringify(defaultSalesPeople, null, 2));
    }
  }

  async getAll() {
    try {
      const data = await fs.readFile(SALESPEOPLE_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading sales people:', error);
      return [];
    }
  }

  async getById(id) {
    const salesPeople = await this.getAll();
    return salesPeople.find(s => s.id === id);
  }

  async getByEmail(email) {
    const salesPeople = await this.getAll();
    return salesPeople.find(s => s.email.toLowerCase() === email.toLowerCase());
  }

  async getActive() {
    const salesPeople = await this.getAll();
    return salesPeople.filter(s => s.status === SalesPersonStatus.ACTIVE);
  }

  async getByIndustry(industry) {
    const salesPeople = await this.getAll();
    return salesPeople.filter(s => 
      s.status === SalesPersonStatus.ACTIVE && 
      s.industries.includes(industry)
    );
  }

  async create(salesData) {
    const salesPeople = await this.getAll();
    
    // Check if email already exists
    const existing = salesPeople.find(s => s.email.toLowerCase() === salesData.email.toLowerCase());
    if (existing) {
      throw new Error('Sales person email already exists');
    }

    const newSalesPerson = {
      id: `sales_${crypto.randomBytes(8).toString('hex')}`,
      name: salesData.name,
      email: salesData.email.toLowerCase(),
      phone: salesData.phone || '',
      department: salesData.department || '',
      territory: salesData.territory || '',
      industries: salesData.industries || [],
      assignedOrganizations: salesData.assignedOrganizations || [],
      activeClientsCount: 0,
      status: salesData.status || SalesPersonStatus.ACTIVE,
      createdAt: new Date().toISOString()
    };

    salesPeople.push(newSalesPerson);
    await fs.writeFile(SALESPEOPLE_FILE, JSON.stringify(salesPeople, null, 2));
    
    return newSalesPerson;
  }

  async update(id, updates) {
    const salesPeople = await this.getAll();
    const index = salesPeople.findIndex(s => s.id === id);
    
    if (index === -1) {
      throw new Error('Sales person not found');
    }

    // Merge updates
    salesPeople[index] = {
      ...salesPeople[index],
      ...updates,
      id: salesPeople[index].id, // Preserve ID
      createdAt: salesPeople[index].createdAt, // Preserve creation date
      updatedAt: new Date().toISOString()
    };

    await fs.writeFile(SALESPEOPLE_FILE, JSON.stringify(salesPeople, null, 2));
    
    return salesPeople[index];
  }

  async assignOrganization(salesPersonId, organizationId) {
    const salesPerson = await this.getById(salesPersonId);
    if (!salesPerson) {
      throw new Error('Sales person not found');
    }

    if (!salesPerson.assignedOrganizations.includes(organizationId)) {
      salesPerson.assignedOrganizations.push(organizationId);
      salesPerson.activeClientsCount = salesPerson.assignedOrganizations.length;
      return this.update(salesPersonId, {
        assignedOrganizations: salesPerson.assignedOrganizations,
        activeClientsCount: salesPerson.activeClientsCount
      });
    }

    return salesPerson;
  }

  async unassignOrganization(salesPersonId, organizationId) {
    const salesPerson = await this.getById(salesPersonId);
    if (!salesPerson) {
      throw new Error('Sales person not found');
    }

    salesPerson.assignedOrganizations = salesPerson.assignedOrganizations.filter(id => id !== organizationId);
    salesPerson.activeClientsCount = salesPerson.assignedOrganizations.length;
    
    return this.update(salesPersonId, {
      assignedOrganizations: salesPerson.assignedOrganizations,
      activeClientsCount: salesPerson.activeClientsCount
    });
  }

  // Auto-assign logic: find best sales person based on industry
  async autoAssign(industry) {
    const salesPeople = await this.getByIndustry(industry);
    
    if (salesPeople.length === 0) {
      // Fallback to any active sales person
      const activeSales = await this.getActive();
      if (activeSales.length === 0) {
        throw new Error('No active sales people available');
      }
      // Round-robin: assign to sales person with least clients
      return activeSales.reduce((prev, current) => 
        (prev.activeClientsCount < current.activeClientsCount) ? prev : current
      );
    }

    // Round-robin among industry-matched sales people
    return salesPeople.reduce((prev, current) => 
      (prev.activeClientsCount < current.activeClientsCount) ? prev : current
    );
  }

  async delete(id) {
    const salesPeople = await this.getAll();
    const filtered = salesPeople.filter(s => s.id !== id);
    
    if (filtered.length === salesPeople.length) {
      throw new Error('Sales person not found');
    }

    await fs.writeFile(SALESPEOPLE_FILE, JSON.stringify(filtered, null, 2));
    
    return true;
  }
}

export default new SalesPerson();
