import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import DrugCatalogRoutes from "./DrugCatalog/routes.js";
import CanonicalIngredientsRoutes from "./CanonicalIngredients/routes.js";
import dotenv from "dotenv";
import multer from "multer";
import { fileURLToPath } from "url";
import path from "path";
import { parsePdf } from "./PdfParser/GeminiParser.js";
import fs from "fs";
import ingredientsRouter from "./routes/ingredientsRouter.js";

// Store for tracking PDF parsing progress
const pdfParsingStatus = new Map();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

dotenv.config();
const mongoUri = process.env.MONGO_URI;

const clientOptions = {
  serverApi: { version: "1", strict: true, deprecationErrors: true },
};

mongoose
  .connect(mongoUri, clientOptions)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB:", err));

// Setup routes
DrugCatalogRoutes(app);
CanonicalIngredientsRoutes(app);
app.use("/ingredients", ingredientsRouter);

// Create upload_files directory if it doesn't exist
const uploadDir = path.join(__dirname, "uploaded_files");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "uploaded_files"));
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

// Endpoint to handle PDF file upload
app.post("/uploadPdf", upload.single("pdf"), async (req, res) => {
  console.log("PDF upload endpoint called");

  if (!req.file) {
    console.log("No file received in upload request");
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    console.log(
      `Received file: ${req.file.originalname}, size: ${req.file.size} bytes`
    );
    const jobId = `pdf_${Date.now()}`;
    const pdfFilePath = path.join(
      __dirname,
      "uploaded_files",
      req.file.originalname
    );

    // Save the file to disk (multer should handle this, but let's verify)
    console.log(`File saved to: ${pdfFilePath}`);

    // Initialize status
    pdfParsingStatus.set(jobId, {
      status: "processing",
      progress: 5,
      message: "PDF uploaded, queued for processing",
      fileName: req.file.originalname,
      startTime: Date.now(),
    });

    console.log(
      `Created job with ID: ${jobId}, sending response to client IMMEDIATELY`
    );

    // IMPORTANT: Send response with job ID before processing starts
    res.status(202).json({
      message: "File uploaded, processing started",
      jobId: jobId,
    });

    console.log(
      `Response sent with jobId: ${jobId}, now starting PDF processing asynchronously`
    );

    // Start processing AFTER sending response (in another execution context)
    setImmediate(() => {
      processPdfAsync(jobId, pdfFilePath);
    });
  } catch (error) {
    console.error("Error handling PDF upload:", error);
    res
      .status(500)
      .json({ error: "Error processing PDF upload: " + error.message });
  }
});

// Endpoint to check status of PDF processing
app.get("/pdfStatus/:jobId", (req, res) => {
  const { jobId } = req.params;

  if (!pdfParsingStatus.has(jobId)) {
    return res.status(404).json({ error: "Job not found" });
  }

  const status = pdfParsingStatus.get(jobId);
  res.status(200).json(status);
});

// Process PDF asynchronously and update status
async function processPdfAsync(jobId, pdfFilePath) {
  try {
    // Update progress
    pdfParsingStatus.set(jobId, {
      ...pdfParsingStatus.get(jobId),
      progress: 10,
      message: "PDF loaded, beginning extraction",
    });

    // Add callback for processing updates
    const updateProgress = (progress, message) => {
      pdfParsingStatus.set(jobId, {
        ...pdfParsingStatus.get(jobId),
        progress,
        message,
      });
    };

    // Parse the PDF with progress updates
    const parsedData = await parsePdf(pdfFilePath, updateProgress);

    // Update status to complete
    pdfParsingStatus.set(jobId, {
      status: "completed",
      progress: 100,
      message: "Processing complete",
      fileName: pdfParsingStatus.get(jobId).fileName,
      startTime: pdfParsingStatus.get(jobId).startTime,
      endTime: Date.now(),
      result: parsedData,
    });

    // Clean up status after 1 hour
    setTimeout(() => {
      if (pdfParsingStatus.has(jobId)) {
        pdfParsingStatus.delete(jobId);
      }
    }, 60 * 60 * 1000);
  } catch (error) {
    console.error("Error processing PDF:", error);

    // Update status to failed
    pdfParsingStatus.set(jobId, {
      status: "failed",
      progress: 0,
      message: `Error: ${error.message}`,
      fileName: pdfParsingStatus.get(jobId).fileName,
      startTime: pdfParsingStatus.get(jobId).startTime,
      endTime: Date.now(),
      error: error.message,
    });
  }
}

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
