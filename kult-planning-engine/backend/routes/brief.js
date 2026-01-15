/**
 * Campaign Brief API Routes
 * Handles file upload, parsing, and AI extraction
 */

import express from 'express';
import multer from 'multer';
import { parseFile } from '../utils/fileParser.js';
import { processDocument } from '../utils/aiExtractor.js';

const router = express.Router();

// Configure multer for in-memory file storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept only PDF, DOCX, DOC, and TXT files
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, DOC, and TXT files are allowed.'));
    }
  }
});

/**
 * POST /api/brief/parse
 * Upload and parse campaign brief document
 * 
 * Request: multipart/form-data with 'file' field
 * Response: JSON with extracted campaign brief
 */
router.post('/parse', upload.single('file'), async (req, res) => {
  try {
    console.log('\n[BRIEF API] New parse request received');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    const { originalname, mimetype, size, buffer } = req.file;
    console.log('[BRIEF API] File:', originalname);
    console.log('[BRIEF API] Type:', mimetype);
    console.log('[BRIEF API] Size:', (size / 1024).toFixed(2), 'KB');
    
    // Step 1: Parse file to extract text
    console.log('[BRIEF API] Step 1: Parsing file...');
    const documentText = await parseFile(buffer, mimetype);
    console.log('[BRIEF API] Extracted text length:', documentText.length, 'chars');
    
    // Step 2: AI extraction + pattern matching + validation
    console.log('[BRIEF API] Step 2: AI extraction...');
    const extractedBrief = await processDocument(documentText);
    console.log('[BRIEF API] Extraction complete');
    
    // Step 3: Return results
    const response = {
      success: true,
      fileName: originalname,
      fileSize: `${(size / 1024).toFixed(2)} KB`,
      extractedInfo: extractedBrief,
      metadata: {
        extractionMethod: extractedBrief._extractionMethod,
        aiModel: extractedBrief._aiModel,
        extractionTime: extractedBrief._extractionTime,
        overallConfidence: extractedBrief._overallConfidence,
        needsReview: extractedBrief._needsReview,
        documentLength: documentText.length
      }
    };
    
    // Clean up internal fields from extractedInfo
    delete response.extractedInfo._extractionMethod;
    delete response.extractedInfo._aiModel;
    delete response.extractedInfo._extractionTime;
    delete response.extractedInfo._overallConfidence;
    delete response.extractedInfo._needsReview;
    delete response.extractedInfo._error;
    
    console.log('[BRIEF API] Sending response');
    console.log('[BRIEF API] Confidence:', response.metadata.overallConfidence?.toFixed(2) || 'N/A');
    console.log('[BRIEF API] Needs review:', response.metadata.needsReview);
    
    res.json(response);
    
  } catch (error) {
    console.error('[BRIEF API ERROR]:', error.message);
    console.error('[BRIEF API ERROR STACK]:', error.stack);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process document',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/brief/extract-text
 * Just extract text from document (no AI extraction)
 * Useful for debugging or showing raw text
 * 
 * Request: multipart/form-data with 'file' field
 * Response: JSON with extracted text
 */
router.post('/extract-text', upload.single('file'), async (req, res) => {
  try {
    console.log('\n[BRIEF API] Text extraction request received');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    const { originalname, mimetype, size, buffer } = req.file;
    console.log('[BRIEF API] File:', originalname);
    
    // Parse file to extract text only
    const documentText = await parseFile(buffer, mimetype);
    
    res.json({
      success: true,
      fileName: originalname,
      fileSize: `${(size / 1024).toFixed(2)} KB`,
      text: documentText,
      textLength: documentText.length
    });
    
  } catch (error) {
    console.error('[BRIEF API ERROR]:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract text',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;
