import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });

export async function parsePdf(pdfFilePath) {
  const pdfResp = fs.readFileSync(pdfFilePath);
  const pdfParsingPrompt = `
  Extract the following structured information from this PDF:
  - Drug Name
  - Active Ingredients
  - Registration Number
  - Registering Company
  - Manufacturing Company
  - Packaging type (e.g., Hộp 1 chai 100ml, Lọ 30 viên, Hộp 3 vỉ, etc.)
  - How many times the drugd's registration has been extended

  If the information is in a table, extract it correctly.
  If the information is in text format, extract it accurately.
  Output the extracted data in **CSV format** with the following headers:
  "name","active_ingredient","registration_number","registering_company","manufacturing_company","packaging_type","registration_extension_count"

  Ensure that:
  1. Each row represents a single drug.
  2. If a drug has multiple active ingredients, separate them with a semicolon (;).
  3. If a field is missing in the document, leave it empty.
  4. The output should only contain the CSV data—no explanations or additional text.
  `;
  const result = await model.generateContent([
    {
      inlineData: {
        data: Buffer.from(pdfResp).toString("base64"),
        mimeType: "application/pdf",
      },
    },
    pdfParsingPrompt,
  ]);
  return result.response.text();
}
