// filepath: /Users/pnguyen/Documents/Projects/pharm_data/pharm-project-25-server/server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import DrugCatalogRoutes from "./DrugCatalog/routes.js";
import dotenv from "dotenv";
import multer from "multer";
import { fileURLToPath } from "url";
import path from "path";
import { parsePdf } from "./PdfParser/GeminiParser.js";

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

DrugCatalogRoutes(app);
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
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  try {
    const pdfFilePath = path.join(
      __dirname,
      "uploaded_files",
      req.file.originalname
    );
    const parsedData = await parsePdf(pdfFilePath);
    res.status(200).json({
      message: "File uploaded and parsed successfully",
      file: req.file,
      parsedData,
    });
  } catch (error) {
    console.error("Error parsing PDF:", error);
    res.status(500).json({ error: "Error parsing PDF" });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
