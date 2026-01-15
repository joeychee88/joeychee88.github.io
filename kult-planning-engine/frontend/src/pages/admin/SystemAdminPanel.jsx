import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';

// Industry options (same as BuildPlanWizard)
const INDUSTRY_OPTIONS = [
  { value: 'automotive_ice', label: 'Automotive (ICE)' },
  { value: 'automotive_ev', label: 'Automotive (EV)' },
  { value: 'property_luxury', label: 'Property (Luxury)' },
  { value: 'property_mid_range', label: 'Property (Mid-Range)' },
  { value: 'property_affordable', label: 'Property (Affordable)' },
  { value: 'fmcg', label: 'FMCG' },
  { value: 'beauty', label: 'Beauty & Cosmetics' },
  { value: 'retail_ecommerce', label: 'Retail / eCommerce' },
  { value: 'telco', label: 'Telco' },
  { value: 'finance_insurance', label: 'Finance / Insurance' },
  { value: 'banking_fintech', label: 'Banking / Fintech' },
  { value: 'tourism', label: 'Tourism' },
  { value: 'tech_devices', label: 'Tech & Devices' },
  { value: 'sme_b2b', label: 'SME / B2B' },
  { value: 'entertainment_ott', label: 'Entertainment / OTT' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'education', label: 'Education' },
  { value: 'f_and_b', label: 'F&B' },
  { value: 'lifestyle', label: 'Lifestyle' }
];

function SystemAdminPanel() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [salesPeople, setSalesPeople] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' }); // success, error
  const [confirmDialog, setConfirmDialog] = useState({ show: false, message: '', onConfirm: null });
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'client_user',
    organizationId: '',
    status: 'active'
  });
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Organization modal state
  const [showAddOrgModal, setShowAddOrgModal] = useState(false);
  const [newOrg, setNewOrg] = useState({
    name: '',
    industry: '',
    assignedSalesPersonId: ''
  });
  
  // Sales Person modal state
  const [showAddSalesPersonModal, setShowAddSalesPersonModal] = useState(false);
  const [newSalesPerson, setNewSalesPerson] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    department: '',
    territory: ''
  });
  
  // Edit Organization state
  const [showEditOrgModal, setShowEditOrgModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  
  // Edit Sales Person state
  const [showEditSalesPersonModal, setShowEditSalesPersonModal] = useState(false);
  const [editingSalesPerson, setEditingSalesPerson] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadUser = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to load user:', error);
      navigate('/login');
    }
  };

  const loadData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      if (activeTab === 'users') {
        const response = await axios.get('/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(response.data.users || []);
        
        // Also load organizations and sales people for dropdowns
        if (organizations.length === 0) {
          const orgResponse = await axios.get('/api/admin/organizations', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setOrganizations(orgResponse.data.organizations || []);
        }
        if (salesPeople.length === 0) {
          const salesResponse = await axios.get('/api/admin/salespeople', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setSalesPeople(salesResponse.data.salesPeople || []);
        }
      } else if (activeTab === 'organizations') {
        const response = await axios.get('/api/admin/organizations', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrganizations(response.data.organizations || []);
        
        // Also load sales people for the assign dropdown
        if (salesPeople.length === 0) {
          const salesResponse = await axios.get('/api/admin/salespeople', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setSalesPeople(salesResponse.data.salesPeople || []);
        }
      } else if (activeTab === 'salespeople') {
        const response = await axios.get('/api/admin/salespeople', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSalesPeople(response.data.salesPeople || []);
      } else if (activeTab === 'stats') {
        const response = await axios.get('/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  // Helper to show confirmation dialog
  const showConfirm = (message, onConfirm) => {
    setConfirmDialog({ show: true, message, onConfirm });
  };

  const handlePromoteUser = async (userId) => {
    showConfirm('Promote this user to Client Admin?', async () => {
      const token = localStorage.getItem('token');
      try {
        await axios.post(`/api/admin/users/${userId}/promote`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification('User promoted successfully!', 'success');
        loadData();
      } catch (error) {
        showNotification('Failed to promote user: ' + (error.response?.data?.error || 'Unknown error'), 'error');
      }
    });
  };

  const handleDeactivateUser = async (userId) => {
    showConfirm('Deactivate this user?', async () => {
      const token = localStorage.getItem('token');
      try {
        await axios.post(`/api/admin/users/${userId}/deactivate`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification('User deactivated successfully!', 'success');
        loadData();
      } catch (error) {
        showNotification('Failed to deactivate user: ' + (error.response?.data?.error || 'Unknown error'), 'error');
      }
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!newUser.name || !newUser.email || !newUser.password) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      await axios.post('/api/admin/users', {
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        organizationId: newUser.organizationId || null,
        status: newUser.status
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showNotification('User created successfully!', 'success');
      setShowAddUserModal(false);
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'client_user',
        organizationId: '',
        status: 'active'
      });
      loadData();
    } catch (error) {
      showNotification('Failed to create user: ' + (error.response?.data?.error || 'Unknown error'), 'error');
    }
  };

  const handleEditUser = (u) => {
    setEditingUser({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      organizationId: u.organizationId || '',
      assignedSalesPersonId: u.assignedSalesPersonId || '',
      status: u.status
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
    if (!editingUser.name || !editingUser.email) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      await axios.put(`/api/admin/users/${editingUser.id}`, {
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        organizationId: editingUser.organizationId || null,
        assignedSalesPersonId: editingUser.assignedSalesPersonId || null,
        status: editingUser.status
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showNotification('User updated successfully!', 'success');
      setShowEditModal(false);
      setEditingUser(null);
      loadData();
    } catch (error) {
      showNotification('Failed to update user: ' + (error.response?.data?.error || 'Unknown error'), 'error');
    }
  };

  const handleCreateOrganization = async (e) => {
    e.preventDefault();
    
    if (!newOrg.name) {
      showNotification('Organization name is required', 'error');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      await axios.post('/api/admin/organizations', {
        name: newOrg.name,
        industry: newOrg.industry || null,
        assignedSalesPersonId: newOrg.assignedSalesPersonId || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showNotification('Organization created successfully!', 'success');
      setShowAddOrgModal(false);
      setNewOrg({ name: '', industry: '', assignedSalesPersonId: '' });
      loadData();
    } catch (error) {
      showNotification('Failed to create organization: ' + (error.response?.data?.error || 'Unknown error'), 'error');
    }
  };

  const handleCreateSalesPerson = async (e) => {
    e.preventDefault();
    
    if (!newSalesPerson.name || !newSalesPerson.email || !newSalesPerson.password) {
      showNotification('Name, email, and password are required', 'error');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      await axios.post('/api/admin/salespeople', {
        name: newSalesPerson.name,
        email: newSalesPerson.email,
        password: newSalesPerson.password,
        phone: newSalesPerson.phone || '',
        department: newSalesPerson.department || '',
        territory: newSalesPerson.territory || ''
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showNotification('Sales person created successfully!', 'success');
      setShowAddSalesPersonModal(false);
      setNewSalesPerson({ name: '', email: '', password: '', phone: '', department: '', territory: '' });
      loadData();
    } catch (error) {
      showNotification('Failed to create sales person: ' + (error.response?.data?.error || 'Unknown error'), 'error');
    }
  };

  const handleEditOrg = (org) => {
    setEditingOrg({
      id: org.id,
      name: org.name,
      industry: org.industry || '',
      assignedSalesPersonId: org.assignedSalesPersonId || ''
    });
    setShowEditOrgModal(true);
    
    // Ensure sales people are loaded
    if (salesPeople.length === 0) {
      const token = localStorage.getItem('token');
      axios.get('/api/admin/salespeople', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(response => {
        setSalesPeople(response.data.salesPeople || []);
      }).catch(error => {
        console.error('Failed to load sales people:', error);
      });
    }
  };

  const handleUpdateOrg = async (e) => {
    e.preventDefault();
    
    if (!editingOrg.name) {
      showNotification('Organization name is required', 'error');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      await axios.put(`/api/admin/organizations/${editingOrg.id}`, {
        name: editingOrg.name,
        industry: editingOrg.industry || null,
        assignedSalesPersonId: editingOrg.assignedSalesPersonId || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showNotification('Organization updated successfully!', 'success');
      setShowEditOrgModal(false);
      setEditingOrg(null);
      loadData();
    } catch (error) {
      showNotification('Failed to update organization: ' + (error.response?.data?.error || 'Unknown error'), 'error');
    }
  };

  const handleEditSalesPerson = (sp) => {
    setEditingSalesPerson({
      id: sp.id,
      name: sp.name,
      email: sp.email,
      phone: sp.phone || '',
      department: sp.department || '',
      territory: sp.territory || ''
    });
    setShowEditSalesPersonModal(true);
  };

  const handleUpdateSalesPerson = async (e) => {
    e.preventDefault();
    
    if (!editingSalesPerson.name || !editingSalesPerson.email) {
      showNotification('Name and email are required', 'error');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      await axios.put(`/api/admin/salespeople/${editingSalesPerson.id}`, {
        name: editingSalesPerson.name,
        email: editingSalesPerson.email,
        phone: editingSalesPerson.phone || '',
        department: editingSalesPerson.department || '',
        territory: editingSalesPerson.territory || ''
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showNotification('Sales person updated successfully!', 'success');
      setShowEditSalesPersonModal(false);
      setEditingSalesPerson(null);
      loadData();
    } catch (error) {
      showNotification('Failed to update sales person: ' + (error.response?.data?.error || 'Unknown error'), 'error');
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">System Admin Panel</h1>
        <p className="text-gray-400">Manage users, organizations, and sales people</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800">
        {['users', 'organizations', 'salespeople', 'stats'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === tab
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      ) : (
        <>
          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">All Users ({users.length})</h2>
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add New User
                </button>
              </div>
              
              <div className="bg-[#0f1419] border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Email</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Role</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Organization</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-800/30">
                        <td className="px-6 py-4 text-white">{u.name}</td>
                        <td className="px-6 py-4 text-gray-400">{u.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            u.role === 'system_admin' ? 'bg-purple-900/30 text-purple-400' :
                            u.role === 'client_admin' ? 'bg-cyan-900/30 text-cyan-400' :
                            u.role === 'sales_person' ? 'bg-green-900/30 text-green-400' :
                            'bg-gray-800 text-gray-400'
                          }`}>
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {u.organization?.name || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            u.status === 'active' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {/* View/Edit Icon Button */}
                            <button
                              onClick={() => handleEditUser(u)}
                              className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-cyan-500 text-gray-400 hover:text-cyan-400 rounded transition-colors"
                              title="View/Edit User"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            
                            {u.role === 'client_user' && (
                              <button
                                onClick={() => handlePromoteUser(u.id)}
                                className="px-3 py-1 bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-700 text-cyan-400 text-xs rounded"
                              >
                                Promote
                              </button>
                            )}
                            {u.status === 'active' && u.id !== user?.id && (
                              <button
                                onClick={() => handleDeactivateUser(u.id)}
                                className="px-3 py-1 bg-red-900/30 hover:bg-red-900/50 border border-red-700 text-red-400 text-xs rounded"
                              >
                                Deactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Organizations Tab */}
          {activeTab === 'organizations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Organizations ({organizations.length})</h2>
                <button
                  onClick={() => setShowAddOrgModal(true)}
                  className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Organization
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {organizations.map((org) => (
                  <div key={org.id} className="bg-[#0f1419] border border-gray-800 rounded-xl p-6 relative group">
                    {/* Edit Button - Top Right */}
                    <button
                      onClick={() => handleEditOrg(org)}
                      className="absolute top-4 right-4 p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-cyan-500 text-gray-400 hover:text-cyan-400 rounded opacity-0 group-hover:opacity-100 transition-all"
                      title="Edit Organization"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    
                    <h3 className="text-lg font-bold text-white mb-2 pr-8">{org.name}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Industry:</span>
                        <span className="text-white">{org.industry || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Users:</span>
                        <span className="text-white">{org.stats?.userCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Campaigns:</span>
                        <span className="text-white">{org.stats?.campaignCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Sales Person:</span>
                        <span className="text-cyan-400">{org.salesPerson?.name || 'Unassigned'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sales People Tab */}
          {activeTab === 'salespeople' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Sales People ({salesPeople.length})</h2>
                <button
                  onClick={() => setShowAddSalesPersonModal(true)}
                  className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Sales Person
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {salesPeople.map((sp) => (
                  <div key={sp.id} className="bg-[#0f1419] border border-gray-800 rounded-xl p-6 relative group">
                    {/* Edit Button - Top Right */}
                    <button
                      onClick={() => handleEditSalesPerson(sp)}
                      className="absolute top-4 right-4 p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-cyan-500 text-gray-400 hover:text-cyan-400 rounded opacity-0 group-hover:opacity-100 transition-all"
                      title="Edit Sales Person"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    
                    <h3 className="text-lg font-bold text-white mb-2 pr-8">{sp.name}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {sp.email}
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {sp.phone}
                      </div>
                      <div className="pt-2 border-t border-gray-800">
                        <span className="text-gray-400">Department:</span>
                        <p className="text-white">{sp.department}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Territory:</span>
                        <p className="text-white">{sp.territory}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Active Clients:</span>
                        <p className="text-cyan-400 font-bold">{sp.stats?.organizationCount || 0}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && stats && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">System Statistics</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-cyan-900/30 to-cyan-800/20 border border-cyan-700 rounded-xl p-6">
                  <div className="text-cyan-400 text-4xl font-bold">{stats.users?.total || 0}</div>
                  <div className="text-gray-300 mt-2">Total Users</div>
                  <div className="text-xs text-gray-400 mt-1">{stats.users?.active} active</div>
                </div>

                <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-700 rounded-xl p-6">
                  <div className="text-purple-400 text-4xl font-bold">{stats.organizations?.total || 0}</div>
                  <div className="text-gray-300 mt-2">Organizations</div>
                  <div className="text-xs text-gray-400 mt-1">{stats.organizations?.active} active</div>
                </div>

                <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-700 rounded-xl p-6">
                  <div className="text-green-400 text-4xl font-bold">{stats.salesPeople?.total || 0}</div>
                  <div className="text-gray-300 mt-2">Sales People</div>
                  <div className="text-xs text-gray-400 mt-1">{stats.salesPeople?.active} active</div>
                </div>

                <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 border border-orange-700 rounded-xl p-6">
                  <div className="text-orange-400 text-4xl font-bold">{stats.campaigns?.total || 0}</div>
                  <div className="text-gray-300 mt-2">Total Campaigns</div>
                  <div className="text-xs text-gray-400 mt-1">{stats.campaigns?.booked || 0} booked</div>
                </div>
              </div>

              {/* Campaign Status Breakdown */}
              {stats.campaigns && (
                <div className="bg-[#0f1419] border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Campaign Status Breakdown</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-gray-400 text-sm">Draft</div>
                      <div className="text-2xl font-bold text-white">{stats.campaigns.byStatus?.draft || 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm">Pending Approval</div>
                      <div className="text-2xl font-bold text-yellow-400">{stats.campaigns.byStatus?.pending_approval || 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm">Approved</div>
                      <div className="text-2xl font-bold text-green-400">{stats.campaigns.byStatus?.approved || 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm">Booked</div>
                      <div className="text-2xl font-bold text-cyan-400">{stats.campaigns.byStatus?.booked || 0}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>  
      )}
    </div>

    {/* Add User Modal */}
    {showAddUserModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-[#0f1419] border border-gray-800 rounded-xl p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Add New User</h3>
            <button
              onClick={() => setShowAddUserModal(false)}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="John Doe"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="john@example.com"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="••••••••"
                minLength="6"
                required
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Role <span className="text-red-400">*</span>
              </label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="client_user">Team Member</option>
                <option value="client_admin">Client Admin</option>
                <option value="sales_person">Sales Person</option>
                <option value="system_admin">System Admin</option>
              </select>
            </div>

            {/* Organization */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Organization (Optional)
              </label>
              <select
                value={newUser.organizationId}
                onChange={(e) => setNewUser({ ...newUser, organizationId: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">None</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <select
                value={newUser.status}
                onChange={(e) => setNewUser({ ...newUser, status: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
              >
                Create User
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Notification Toast */}
    {notification.show && (
      <div className="fixed top-4 right-4 z-50 animate-fade-in">
        <div className={`px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${
          notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {notification.type === 'success' ? (
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span className="text-white font-medium">{notification.message}</span>
        </div>
      </div>
    )}

    {/* Edit User Modal */}
    {showEditModal && editingUser && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-[#0f1419] border border-gray-800 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Edit User</h3>
            <button
              onClick={() => {
                setShowEditModal(false);
                setEditingUser(null);
              }}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleUpdateUser} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={editingUser.name}
                onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="John Doe"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={editingUser.email}
                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="john@example.com"
                required
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Role <span className="text-red-400">*</span>
              </label>
              <select
                value={editingUser.role}
                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="client_user">Team Member</option>
                <option value="client_admin">Client Admin</option>
                <option value="sales_person">Sales Person</option>
                <option value="system_admin">System Admin</option>
              </select>
            </div>

            {/* Organization */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Organization (Optional)
              </label>
              <select
                value={editingUser.organizationId}
                onChange={(e) => setEditingUser({ ...editingUser, organizationId: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">None</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>

            {/* Assigned Sales Person */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Assigned Sales Person (Optional)
              </label>
              <select
                value={editingUser.assignedSalesPersonId}
                onChange={(e) => setEditingUser({ ...editingUser, assignedSalesPersonId: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">None</option>
                {salesPeople.map((sp) => (
                  <option key={sp.id} value={sp.id}>{sp.name}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <select
                value={editingUser.status}
                onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
              >
                Update User
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Add Organization Modal */}
    {showAddOrgModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-[#0f1419] border border-gray-800 rounded-xl p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Add New Organization</h3>
            <button
              onClick={() => setShowAddOrgModal(false)}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleCreateOrganization} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Organization Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={newOrg.name}
                onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="Acme Corporation"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Industry (Optional)
              </label>
              <select
                value={newOrg.industry}
                onChange={(e) => setNewOrg({ ...newOrg, industry: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">Select industry...</option>
                <option value="automotive_ice">Automotive (ICE)</option>
                <option value="automotive_ev">Automotive (EV)</option>
                <option value="property_luxury">Property (Luxury)</option>
                <option value="property_mid_range">Property (Mid-Range)</option>
                <option value="property_affordable">Property (Affordable)</option>
                <option value="fmcg">FMCG</option>
                <option value="beauty_cosmetics">Beauty & Cosmetics</option>
                <option value="retail_ecommerce">Retail / eCommerce</option>
                <option value="telco">Telco</option>
                <option value="finance_insurance">Finance / Insurance</option>
                <option value="banking_fintech">Banking / Fintech</option>
                <option value="tourism">Tourism</option>
                <option value="tech_devices">Tech & Devices</option>
                <option value="sme_b2b">SME / B2B</option>
                <option value="entertainment_ott">Entertainment / OTT</option>
                <option value="gaming">Gaming</option>
                <option value="luxury">Luxury</option>
                <option value="media_entertainment">Media / Entertainment</option>
                <option value="professional_services">Professional Services</option>
                <option value="education">Education</option>
                <option value="f_and_b">F&B</option>
                <option value="lifestyle">Lifestyle</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Assign Sales Person (Optional)
              </label>
              <select
                value={newOrg.assignedSalesPersonId}
                onChange={(e) => setNewOrg({ ...newOrg, assignedSalesPersonId: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">None</option>
                {salesPeople.map((sp) => (
                  <option key={sp.id} value={sp.id}>{sp.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowAddOrgModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
              >
                Create Organization
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Add Sales Person Modal */}
    {showAddSalesPersonModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-[#0f1419] border border-gray-800 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Add New Sales Person</h3>
            <button
              onClick={() => setShowAddSalesPersonModal(false)}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleCreateSalesPerson} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={newSalesPerson.name}
                onChange={(e) => setNewSalesPerson({ ...newSalesPerson, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="John Sales"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={newSalesPerson.email}
                onChange={(e) => setNewSalesPerson({ ...newSalesPerson, email: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="john.sales@company.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={newSalesPerson.password}
                onChange={(e) => setNewSalesPerson({ ...newSalesPerson, password: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="••••••••"
                minLength="6"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Phone (Optional)
              </label>
              <input
                type="tel"
                value={newSalesPerson.phone}
                onChange={(e) => setNewSalesPerson({ ...newSalesPerson, phone: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="+60 12-345 6789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Department (Optional)
              </label>
              <input
                type="text"
                value={newSalesPerson.department}
                onChange={(e) => setNewSalesPerson({ ...newSalesPerson, department: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="Sales"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Territory (Optional)
              </label>
              <input
                type="text"
                value={newSalesPerson.territory}
                onChange={(e) => setNewSalesPerson({ ...newSalesPerson, territory: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="Kuala Lumpur"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowAddSalesPersonModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
              >
                Create Sales Person
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Edit Organization Modal */}
    {showEditOrgModal && editingOrg && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-[#0f1419] border border-gray-800 rounded-xl p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Edit Organization</h3>
            <button
              onClick={() => {
                setShowEditOrgModal(false);
                setEditingOrg(null);
              }}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleUpdateOrg} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Organization Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={editingOrg.name}
                onChange={(e) => setEditingOrg({ ...editingOrg, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="Acme Corporation"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Industry (Optional)
              </label>
              <select
                value={editingOrg.industry}
                onChange={(e) => setEditingOrg({ ...editingOrg, industry: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">Select industry...</option>
                <option value="automotive_ice">Automotive (ICE)</option>
                <option value="automotive_ev">Automotive (EV)</option>
                <option value="property_luxury">Property (Luxury)</option>
                <option value="property_mid_range">Property (Mid-Range)</option>
                <option value="property_affordable">Property (Affordable)</option>
                <option value="fmcg">FMCG</option>
                <option value="beauty_cosmetics">Beauty & Cosmetics</option>
                <option value="retail_ecommerce">Retail / eCommerce</option>
                <option value="telco">Telco</option>
                <option value="finance_insurance">Finance / Insurance</option>
                <option value="banking_fintech">Banking / Fintech</option>
                <option value="tourism">Tourism</option>
                <option value="tech_devices">Tech & Devices</option>
                <option value="sme_b2b">SME / B2B</option>
                <option value="entertainment_ott">Entertainment / OTT</option>
                <option value="gaming">Gaming</option>
                <option value="luxury">Luxury</option>
                <option value="media_entertainment">Media / Entertainment</option>
                <option value="professional_services">Professional Services</option>
                <option value="education">Education</option>
                <option value="f_and_b">F&B</option>
                <option value="lifestyle">Lifestyle</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Assign Sales Person (Optional)
              </label>
              <select
                value={editingOrg.assignedSalesPersonId}
                onChange={(e) => setEditingOrg({ ...editingOrg, assignedSalesPersonId: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">None</option>
                {salesPeople.map((sp) => (
                  <option key={sp.id} value={sp.id}>{sp.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowEditOrgModal(false);
                  setEditingOrg(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
              >
                Update Organization
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Edit Sales Person Modal */}
    {showEditSalesPersonModal && editingSalesPerson && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-[#0f1419] border border-gray-800 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Edit Sales Person</h3>
            <button
              onClick={() => {
                setShowEditSalesPersonModal(false);
                setEditingSalesPerson(null);
              }}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleUpdateSalesPerson} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={editingSalesPerson.name}
                onChange={(e) => setEditingSalesPerson({ ...editingSalesPerson, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="John Sales"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={editingSalesPerson.email}
                onChange={(e) => setEditingSalesPerson({ ...editingSalesPerson, email: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="john.sales@company.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Phone (Optional)
              </label>
              <input
                type="tel"
                value={editingSalesPerson.phone}
                onChange={(e) => setEditingSalesPerson({ ...editingSalesPerson, phone: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="+60 12-345 6789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Department (Optional)
              </label>
              <input
                type="text"
                value={editingSalesPerson.department}
                onChange={(e) => setEditingSalesPerson({ ...editingSalesPerson, department: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="Sales"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Territory (Optional)
              </label>
              <input
                type="text"
                value={editingSalesPerson.territory}
                onChange={(e) => setEditingSalesPerson({ ...editingSalesPerson, territory: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="Kuala Lumpur"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowEditSalesPersonModal(false);
                  setEditingSalesPerson(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
              >
                Update Sales Person
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Confirmation Dialog */}
    {confirmDialog.show && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-[#0f1419] border border-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-bold text-white mb-4">Confirm Action</h3>
          <p className="text-gray-300 mb-6">{confirmDialog.message}</p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmDialog({ show: false, message: '', onConfirm: null })}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setConfirmDialog({ show: false, message: '', onConfirm: null });
                if (confirmDialog.onConfirm) confirmDialog.onConfirm();
              }}
              className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    )}

    </Layout>
  );
}

export default SystemAdminPanel;
