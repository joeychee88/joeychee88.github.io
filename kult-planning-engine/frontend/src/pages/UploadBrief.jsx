import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import CampaignBriefPanel from '../components/CampaignBriefPanel';

function UploadBrief() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [uploadState, setUploadState] = useState('idle'); // idle, uploading, uploaded, processing, processed
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [briefSummary, setBriefSummary] = useState(null);
  const [error, setError] = useState(null);
  const [brief, setBrief] = useState({});
  
  // Handler to update brief from panel edits
  const handleBriefUpdate = (fieldKey, newValue) => {
    console.log(`📝 [PANEL EDIT] Updating ${fieldKey} to:`, newValue);
    setBrief(prev => ({
      ...prev,
      [fieldKey]: newValue
    }));
    // Also update briefSummary for consistency
    if (briefSummary) {
      setBriefSummary(prev => ({
        ...prev,
        extractedInfo: {
          ...prev.extractedInfo,
          [fieldKey]: newValue
        }
      }));
    }
  };

  // Handle file selection
  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];

    if (!validTypes.includes(file.type)) {
      setError('Please upload a PDF, DOCX, or TXT file');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('File size must be less than 10MB');
      return;
    }

    setError(null);
    setUploadedFile(file);
    setUploadState('uploaded');

    // Simulate processing (in real implementation, this would parse the document)
    setTimeout(() => {
      processUploadedFile(file);
    }, 1000);
  };

  // Process uploaded file with REAL AI extraction
  const processUploadedFile = async (file) => {
    setUploadState('processing');
    setError(null);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      console.log('[UPLOAD] Sending file to backend:', file.name);

      // Call backend API for parsing and AI extraction (via proxy)
      const response = await fetch('/api/brief/parse', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process file');
      }

      const data = await response.json();
      console.log('[UPLOAD] Extraction successful:', data);

      // Update state with real extracted data
      const summary = {
        fileName: data.fileName,
        fileSize: data.fileSize,
        extractedInfo: data.extractedInfo,
        metadata: data.metadata
      };

      setBriefSummary(summary);
      setBrief(data.extractedInfo); // Update brief for panel
      setUploadState('processed');

      // Show notification if extraction needs review
      if (data.metadata?.needsReview) {
        console.warn('[UPLOAD] Low confidence extraction - user review recommended');
      }

    } catch (err) {
      console.error('[UPLOAD ERROR]:', err);
      setError(`Failed to process file: ${err.message}`);
      setUploadState('idle');
      setUploadedFile(null);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const resetUpload = () => {
    setUploadState('idle');
    setUploadedFile(null);
    setBriefSummary(null);
    setError(null);
  };

  return (
    <Layout>
      {/* Campaign Brief Panel - Collapsible Right Sidebar */}
      <CampaignBriefPanel 
        brief={brief} 
        onUpdate={handleBriefUpdate}
        isCollapsed={false}
      />
      
      <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ marginRight: '320px' }}>
        {/* Header */}
        <div className="max-w-4xl mx-auto mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-[#94A3B8] hover:text-white transition-colors mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
          
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Upload Your <span className="sharp-gradient-text">Brief</span>
          </h1>
          <p className="text-[#94A3B8]">
            Upload your campaign brief document and we'll help you build a strategic media plan
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Upload Area */}
          {(uploadState === 'idle' || uploadState === 'uploaded') && (
            <div className="kult-card">
              <div
                className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-all ${
                  isDragging
                    ? 'border-[#00E5CC] bg-[#00E5CC]/10'
                    : 'border-[#1E293B] hover:border-[#00E5CC]/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleFileInputChange}
                />

                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[#00E5CC]/20 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-[#00E5CC]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Drop your brief here or click to browse
                    </h3>
                    <p className="text-[#94A3B8] text-sm">
                      Supports PDF, DOCX, DOC, or TXT files (max 10MB)
                    </p>
                  </div>

                  <button
                    onClick={triggerFileInput}
                    className="kult-btn-primary"
                  >
                    Choose File
                  </button>

                  {uploadedFile && uploadState === 'uploaded' && (
                    <div className="mt-4 flex items-center space-x-3 text-sm">
                      <svg className="w-5 h-5 text-[#00E5CC]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-white">{uploadedFile.name}</span>
                      <span className="text-[#94A3B8]">
                        ({(uploadedFile.size / 1024).toFixed(2)} KB)
                      </span>
                    </div>
                  )}

                  {error && (
                    <div className="mt-4 flex items-center space-x-2 text-sm text-red-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Processing State */}
          {uploadState === 'processing' && (
            <div className="kult-card">
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-[#00E5CC]/20 flex items-center justify-center mx-auto mb-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00E5CC]"></div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Processing your brief...
                </h3>
                <p className="text-[#94A3B8]">
                  Extracting campaign information and analyzing requirements
                </p>
              </div>
            </div>
          )}

          {/* Brief Summary & Choice */}
          {uploadState === 'processed' && briefSummary && (
            <div className="space-y-6">
              {/* Brief Summary */}
              <div className="kult-card">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-1">Brief Summary</h2>
                    <p className="text-[#94A3B8] text-sm mb-2">
                      Extracted from: {briefSummary.fileName}
                    </p>
                    {briefSummary.metadata && (
                      <div className="flex items-center space-x-4 text-xs">
                        <div className="flex items-center space-x-1">
                          <span className="text-[#94A3B8]">Confidence:</span>
                          <span className={`font-semibold ${
                            briefSummary.metadata.overallConfidence >= 0.8 ? 'text-[#00E5CC]' :
                            briefSummary.metadata.overallConfidence >= 0.6 ? 'text-yellow-400' :
                            'text-[#FF0080]'
                          }`}>
                            {(briefSummary.metadata.overallConfidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-[#94A3B8]">Method:</span>
                          <span className="text-[#00E5CC] font-mono">
                            {briefSummary.metadata.extractionMethod}
                          </span>
                        </div>
                        {briefSummary.metadata.needsReview && (
                          <div className="flex items-center space-x-1 text-[#FF0080]">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="font-semibold">Review Recommended</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={resetUpload}
                    className="text-[#94A3B8] hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(briefSummary.extractedInfo)
                    .filter(([key]) => !key.startsWith('_') && key !== 'confidence') // Filter out metadata and confidence
                    .map(([key, value]) => {
                      // Skip if value is null or undefined
                      if (value === null || value === undefined) return null;
                      
                      // Convert value to string safely
                      const displayValue = typeof value === 'object' 
                        ? JSON.stringify(value) 
                        : String(value);
                      
                      return (
                        <div
                          key={key}
                          className="bg-[#0F1420] rounded-lg p-4 border border-[#1E293B]"
                        >
                          <div className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1">
                            {key.replace(/([A-Z_])/g, ' $1').trim().replace(/\s+/g, ' ')}
                          </div>
                          <div className="text-white font-medium">{displayValue}</div>
                        </div>
                      );
                    })
                    .filter(Boolean) // Remove null entries
                  }
                </div>
              </div>

              {/* Next Steps Choice */}
              <div className="kult-card">
                <h2 className="text-2xl font-bold text-white mb-2">
                  What would you like to do next?
                </h2>
                <p className="text-[#94A3B8] mb-6">
                  Choose how you'd like to build your media plan
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Option 1: AI Campaign Wizard */}
                  <button
                    onClick={() => navigate('/ai-wizard', { state: { briefData: briefSummary.extractedInfo } })}
                    className="group relative bg-gradient-to-br from-[#00E5CC]/20 to-[#00E5CC]/5 border-2 border-[#00E5CC] rounded-xl p-6 text-left hover:from-[#00E5CC]/30 hover:to-[#00E5CC]/10 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-lg bg-[#00E5CC]/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-[#00E5CC]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="px-3 py-1 bg-[#00E5CC]/20 text-[#00E5CC] text-xs font-semibold rounded-full">
                        RECOMMENDED
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#00E5CC] transition-colors">
                      AI Campaign Wizard
                    </h3>
                    <p className="text-[#94A3B8] text-sm mb-4">
                      Let AI guide you through a conversational planning process. Perfect for refining details and exploring options.
                    </p>

                    <div className="flex items-center text-[#00E5CC] text-sm font-medium">
                      <span>Start AI Planning</span>
                      <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>

                  {/* Option 2: Build Plan Manually */}
                  <button
                    onClick={() => navigate('/build-plan', { state: { briefData: briefSummary.extractedInfo } })}
                    className="group relative bg-[#1A1F35] border-2 border-[#1E293B] rounded-xl p-6 text-left hover:border-[#00E5CC]/50 hover:bg-[#1A1F35]/80 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-lg bg-[#94A3B8]/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-[#94A3B8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#00E5CC] transition-colors">
                      Build Plan Manually
                    </h3>
                    <p className="text-[#94A3B8] text-sm mb-4">
                      Use the traditional planning interface with full control over every detail. Best for experienced planners.
                    </p>

                    <div className="flex items-center text-[#94A3B8] group-hover:text-[#00E5CC] text-sm font-medium transition-colors">
                      <span>Go to Planner</span>
                      <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default UploadBrief;
