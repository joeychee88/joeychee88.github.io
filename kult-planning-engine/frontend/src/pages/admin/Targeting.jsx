import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';

function AdminTargeting() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState(null);

  // State for all targeting types
  const [geographicTargeting, setGeographicTargeting] = useState([]);
  const [contextualTargeting, setContextualTargeting] = useState([]);
  const [deviceTargeting, setDeviceTargeting] = useState([]);
  const [timeOfDayTargeting, setTimeOfDayTargeting] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    targeting_type: '',
    criteria: '',
    premium_multiplier: 1.0
  });

  // Load from localStorage on mount
  useEffect(() => {
    const loadData = () => {
      try {
        const geo = JSON.parse(localStorage.getItem('geographicTargeting') || '[]');
        const ctx = JSON.parse(localStorage.getItem('contextualTargeting') || '[]');
        const dev = JSON.parse(localStorage.getItem('deviceTargeting') || '[]');
        const tod = JSON.parse(localStorage.getItem('timeOfDayTargeting') || '[]');

        setGeographicTargeting(geo);
        setContextualTargeting(ctx);
        setDeviceTargeting(dev);
        setTimeOfDayTargeting(tod);
      } catch (error) {
        console.error('Error loading targeting data:', error);
      }
    };

    loadData();
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('geographicTargeting', JSON.stringify(geographicTargeting));
  }, [geographicTargeting]);

  useEffect(() => {
    localStorage.setItem('contextualTargeting', JSON.stringify(contextualTargeting));
  }, [contextualTargeting]);

  useEffect(() => {
    localStorage.setItem('deviceTargeting', JSON.stringify(deviceTargeting));
  }, [deviceTargeting]);

  useEffect(() => {
    localStorage.setItem('timeOfDayTargeting', JSON.stringify(timeOfDayTargeting));
  }, [timeOfDayTargeting]);

  const openModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);
    if (item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        targeting_type: item.targeting_type || '',
        criteria: item.criteria || '',
        premium_multiplier: item.premium_multiplier || 1.0
      });
    } else {
      setFormData({
        name: '',
        description: '',
        targeting_type: type,
        criteria: '',
        premium_multiplier: 1.0
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      targeting_type: '',
      criteria: '',
      premium_multiplier: 1.0
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newItem = {
      id: editingItem?.id || Date.now(),
      ...formData,
      created_at: editingItem?.created_at || new Date().toISOString()
    };

    const updateList = (currentList) => {
      if (editingItem) {
        return currentList.map(item => item.id === editingItem.id ? newItem : item);
      } else {
        return [...currentList, newItem];
      }
    };

    switch (modalType) {
      case 'geographic':
        setGeographicTargeting(updateList(geographicTargeting));
        break;
      case 'contextual':
        setContextualTargeting(updateList(contextualTargeting));
        break;
      case 'device':
        setDeviceTargeting(updateList(deviceTargeting));
        break;
      case 'timeofday':
        setTimeOfDayTargeting(updateList(timeOfDayTargeting));
        break;
      default:
        break;
    }

    closeModal();
  };

  const handleDelete = (type, id) => {
    if (!window.confirm('Are you sure you want to delete this targeting option?')) {
      return;
    }

    switch (type) {
      case 'geographic':
        setGeographicTargeting(geographicTargeting.filter(item => item.id !== id));
        break;
      case 'contextual':
        setContextualTargeting(contextualTargeting.filter(item => item.id !== id));
        break;
      case 'device':
        setDeviceTargeting(deviceTargeting.filter(item => item.id !== id));
        break;
      case 'timeofday':
        setTimeOfDayTargeting(timeOfDayTargeting.filter(item => item.id !== id));
        break;
      default:
        break;
    }
  };

  const TargetingCard = ({ title, description, items, type, icon }) => (
    <div className="bg-[#111] border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className={`p-3 rounded-lg ${icon.bgColor} mr-3`}>
            <svg className={`w-6 h-6 ${icon.textColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon.path} />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>{title}</h3>
            <p className="text-sm text-gray-400">{description}</p>
          </div>
        </div>
        <button
          onClick={() => openModal(type)}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-purple-700 transition-all"
        >
          Add {title}
        </button>
      </div>
      
      {items.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No {title.toLowerCase()} options configured</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-white">{item.name}</h4>
                  {item.description && (
                    <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                  )}
                  {item.criteria && (
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="font-medium text-cyan-400">Criteria:</span> {item.criteria}
                    </p>
                  )}
                  <div className="flex items-center mt-2 space-x-4">
                    <span className="text-xs font-medium text-cyan-400">
                      Multiplier: {item.premium_multiplier}x
                    </span>
                    <span className="text-xs text-gray-600">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => openModal(type, item)}
                    className="p-2 text-cyan-400 hover:bg-cyan-900/20 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(type, item.id)}
                    className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0a0a]">
        {/* Header */}
        <div className="border-b border-gray-800 bg-[#0f0f0f] px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-cyan-400 font-black mb-2 tracking-wider uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                [ ADMIN / TARGETING ]
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>Targeting Configuration</h1>
              <p className="text-gray-400 mt-1 text-sm sm:text-base">
                Manage geographic, contextual, device, and time-of-day targeting options
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Geographic Targeting */}
          <TargetingCard
            title="Geographic Targeting"
            description="Location-based targeting options"
            items={geographicTargeting}
            type="geographic"
            icon={{
              bgColor: 'bg-cyan-900/30',
              textColor: 'text-cyan-400',
              path: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7'
            }}
          />

          {/* Contextual Targeting */}
          <TargetingCard
            title="Contextual Targeting"
            description="Content-based targeting options"
            items={contextualTargeting}
            type="contextual"
            icon={{
              bgColor: 'bg-purple-900/30',
              textColor: 'text-purple-400',
              path: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z'
            }}
          />

          {/* Device Targeting */}
          <TargetingCard
            title="Device Targeting"
            description="Device and platform targeting"
            items={deviceTargeting}
            type="device"
            icon={{
              bgColor: 'bg-pink-900/30',
              textColor: 'text-pink-400',
              path: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z'
            }}
          />

          {/* Time of Day Targeting */}
          <TargetingCard
            title="Time-of-Day Targeting"
            description="Temporal targeting options"
            items={timeOfDayTargeting}
            type="timeofday"
            icon={{
              bgColor: 'bg-orange-900/30',
              textColor: 'text-orange-400',
              path: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
            }}
          />
        </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
            <div className="bg-[#0f0f0f] border border-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="text-xl font-black text-white uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                {editingItem ? 'Edit' : 'Add'} {modalType.charAt(0).toUpperCase() + modalType.slice(1)} Targeting
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  placeholder="e.g., Major Cities, Mobile Devices"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  rows="3"
                  placeholder="Describe this targeting option..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Criteria
                </label>
                <input
                  type="text"
                  value={formData.criteria}
                  onChange={(e) => setFormData({ ...formData, criteria: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  placeholder="e.g., Kuala Lumpur, Selangor, Penang"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Premium Multiplier
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="5"
                  value={formData.premium_multiplier}
                  onChange={(e) => setFormData({ ...formData, premium_multiplier: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  CPM multiplier for this targeting option (1.0 = no change)
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-[#1a1a1a] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-purple-700 transition-all"
                >
                  {editingItem ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
}

export default AdminTargeting;
