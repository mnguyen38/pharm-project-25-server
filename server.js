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
mongoose
  .connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB:", err));

DrugCatalogRoutes(app);
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
