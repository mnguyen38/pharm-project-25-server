import * as dao from './dao.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parsePdf } from "../PdfParser/GeminiParser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploaded_files');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

export default function DrugCatalogRoutes(app) {
  // Existing routes
  app.post('/drugCatalog', async (req, res) => {
    try {
      const drugs = req.body;
      const result = await dao.createDrugCatalog(drugs);
      
      res.status(201).json({
        message: 'Upload completed',
        insertedCount: result.insertedCount,
        skippedCount: result.skippedCount,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Some fixes to display drugs in pages to better load data
  app.get('/drugCatalog', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25; // Number can be changable having this to test
    try {
      const drugs = await dao.findAllDrugCatalog({ page, limit });
      res.json(drugs);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/drugCatalog/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const drug = await dao.findDrugCatalogById(id);
      if (drug) {
        res.json(drug);
      } else {
        res.status(404).json({ error: 'Drug not found' });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/drugCatalog/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const drugUpdates = req.body;
      const drug = await dao.updateDrugCatalog(id, drugUpdates);
      if (drug) {
        res.json(drug);
      } else {
        res.status(404).json({ error: 'Drug not found' });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/drugCatalog/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const drug = await dao.deleteDrugCatalog(id);
      if (drug) {
        res.json(drug);
      } else {
        res.status(404).json({ error: 'Drug not found' });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/uploadPdf', upload.single('pdf'), async (req, res) => {

    req.setTimeout(120000); 
    console.log("PDF upload endpoint called");
    // Check if a file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    try {
      // Get the path to the uploaded file
      const pdfFilePath = req.file.path;
      
      // Check if file exists
      if (!fs.existsSync(pdfFilePath)) {
        return res.status(404).json({ 
          error: 'File not found after upload', 
          details: 'The uploaded file could not be found on the server'
        });
      }
      
      // Check file size
      const stats = fs.statSync(pdfFilePath);
      if (stats.size === 0) {
        return res.status(400).json({ 
          error: 'Empty file uploaded', 
          details: 'The uploaded PDF file is empty'
        });
      }
      
      // Try to read the file
      let fileBuffer;
      try {
        fileBuffer = fs.readFileSync(pdfFilePath);
        if (!fileBuffer || fileBuffer.length === 0) {
          throw new Error('Empty file buffer');
        }
      } catch (readError) {
        return res.status(500).json({ 
          error: 'File read error', 
          details: `Failed to read the uploaded file: ${readError.message}`
        });
      }
      
      // Check if it appears to be a PDF (starts with %PDF-)
      const isPdf = fileBuffer.slice(0, 5).toString() === '%PDF-';
      if (!isPdf) {
        return res.status(400).json({ 
          error: 'Invalid PDF file', 
          details: 'The uploaded file does not appear to be a valid PDF'
        });
      }
      
      // Parse the PDF file
      try {
        const parsedData = await parsePdf(pdfFilePath);
        
        // Check if parsing returned valid data
        if (!parsedData) {
          throw new Error('Parser returned no data');
        }
        
        if (typeof parsedData === 'string') {
          // If we received raw CSV or text instead of objects, that's an error
          throw new Error('Parser returned raw text instead of structured data');
        }
        
        // Return the parsed data
        res.status(200).json({
          message: 'File uploaded and parsed successfully',
          file: {
            filename: req.file.filename,
            originalname: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
          },
          parsedData,
          recordCount: Array.isArray(parsedData) ? parsedData.length : 0
        });
        
      } catch (parseError) {
        console.error('PDF Parsing error:', parseError);
        return res.status(500).json({ 
          error: 'PDF parsing failed', 
          details: `Failed to parse the PDF: ${parseError.message}`,
          stack: process.env.NODE_ENV === 'development' ? parseError.stack : undefined
        });
      }
      
    } catch (error) {
      console.error('Unexpected error during PDF upload:', error);
      res.status(500).json({ 
        error: 'Server error processing PDF', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });
}