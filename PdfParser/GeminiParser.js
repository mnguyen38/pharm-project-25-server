import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { PDFDocument } from "pdf-lib";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });

// Constants for chunking PDFs
const PAGES_PER_CHUNK = 5; // Process 5 pages at a time

// Base prompt template for PDF parsing - shared between full PDF and chunk processing
const BASE_PROMPT_TEMPLATE = `
You are an expert pharmaceutical data extraction specialist. Extract structured information from this Vietnamese pharmaceutical drug registration document from the Ministry of Health (Bộ Y Tế).

The document structure includes:
- Medication entries numbered from 1-79
- Each medication has details like name, active ingredients, dosage form, etc.
- Medications are grouped under registration companies and manufacturing companies

For each medication, extract these fields:
- STT (Order number)
- Tên thuốc (Drug Name) - Column 2
- Hoạt chất chính – Hàm lượng (Active Ingredients and Strength) - Column 3
- Dạng bào chế (Dosage Form) - Column 4
- Quy cách đóng gói (Packaging) - Column 5
- Tiêu chuẩn (Quality Standard) - Column 6
- Tuổi thọ (Shelf Life in months) - Column 7
- Số đăng ký (Registration Number) - Column 8
- Cơ sở đăng ký (Registration Company) - Look for "Cơ sở đăng ký:" heading
- Cơ sở sản xuất (Manufacturing Company) - Look for "Cơ sở sản xuất:" heading

Format your output as a JSON array of objects. Each object should have these exact property names:
- name (from Tên thuốc)
- ingredients (from Hoạt chất chính – Hàm lượng)
- registrationNumber (from Số đăng ký)
- manufacturingRequirements (leave empty string)
- unitOfMeasure (from Dạng bào chế)
- estimatedPrice (set to 0)
- manufacturer (from Cơ sở sản xuất)
- distributor (from Cơ sở đăng ký)
- yearOfRegistration (extract year from registration number if possible, e.g., "2011" from 890110007925)
- countryOfOrigin (extract from manufacturer address if possible)
- usageForm (copy from Dạng bào chế)
- contentOfReview (leave empty string)
- noProposalsOnPrice (leave empty string)
- dateOfProposolsOnPrice (leave empty string)
- additionalNotes (combine packaging, quality standard, and shelf life information)

ONLY respond with valid JSON. No explanatory text before or after. The response should be parseable by JSON.parse().
`;

export async function parsePdf(pdfFilePath) {
  try {
    const pdfBuffer = fs.readFileSync(pdfFilePath);

    // Get PDF page count
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();

    if (pageCount > PAGES_PER_CHUNK) {
      console.log(
        `PDF has ${pageCount} pages. Processing in chunks of ${PAGES_PER_CHUNK} pages...`
      );
      return await processLargePdf(pdfBuffer, pageCount);
    } else {
      return await processSinglePdf(pdfBuffer);
    }
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

// Process a single PDF (original method)
async function processSinglePdf(pdfBuffer) {
  try {
    // Create a prompt for processing the entire PDF
    const pdfParsingPrompt = `
    ${BASE_PROMPT_TEMPLATE}
    BE COMPLETELY SURE YOU PARSE EVERY SINGLE PAGE OF THE PDF.
    `;

    const result = await model.generateContent([
      {
        inlineData: {
          data: Buffer.from(pdfBuffer).toString("base64"),
          mimeType: "application/pdf",
        },
      },
      pdfParsingPrompt,
    ]);

    const jsonText = result.response.text();
    return parseJsonResponse(jsonText);
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

// Process a large PDF by splitting it into page-based chunks
async function processLargePdf(pdfBuffer, totalPages) {
  const numChunks = Math.ceil(totalPages / PAGES_PER_CHUNK);
  console.log(`Splitting PDF into ${numChunks} chunks for processing...`);

  let allDrugs = [];

  for (let i = 0; i < numChunks; i++) {
    // Calculate page range for this chunk
    const startPage = i * PAGES_PER_CHUNK;
    const endPage = Math.min((i + 1) * PAGES_PER_CHUNK - 1, totalPages - 1);
    console.log(
      `Processing chunk ${i + 1}/${numChunks} (pages ${startPage + 1}-${
        endPage + 1
      })...`
    );

    // Extract the specific pages for this chunk
    const pdfChunk = await extractPdfPages(pdfBuffer, startPage, endPage);

    // Create a chunk-specific prompt by extending the base prompt
    const chunkPrompt = `
    ${BASE_PROMPT_TEMPLATE}

    IMPORTANT: This is chunk ${
      i + 1
    } of ${numChunks} from a large document, containing pages ${
      startPage + 1
    } to ${endPage + 1} of ${totalPages} total pages.
    ${
      i > 0
        ? "There may be partially visible entries at the beginning that were completed in the previous chunk - DO NOT include these partial entries."
        : ""
    }
    ${
      i < numChunks - 1
        ? "There may be incomplete entries at the end that continue in the next chunk - DO NOT include these partial entries."
        : ""
    }

    Only extract COMPLETE medication entries where ALL required information is visible within this page range.

    If you see no complete entries in this chunk, return an empty array: [].
    `;

    // Process the chunk
    try {
      const result = await model.generateContent([
        {
          inlineData: {
            data: Buffer.from(pdfChunk).toString("base64"),
            mimeType: "application/pdf",
          },
        },
        chunkPrompt,
      ]);

      const jsonText = result.response.text();
      console.log(
        `Chunk ${i + 1} response length: ${jsonText.length} characters`
      );

      // Parse the chunk results
      const chunkDrugs = await parseJsonResponse(jsonText);
      console.log(
        `Extracted ${chunkDrugs.length} drug entries from chunk ${
          i + 1
        } (pages ${startPage + 1}-${endPage + 1})`
      );

      // Add to our collected results
      allDrugs = [...allDrugs, ...chunkDrugs];
    } catch (error) {
      console.error(
        `Error processing chunk ${i + 1} (pages ${startPage + 1}-${
          endPage + 1
        }):`,
        error
      );
      console.log("Continuing to next chunk...");
    }
  }

  console.log(
    `Finished processing all chunks. Total drugs extracted: ${allDrugs.length}`
  );
  return allDrugs;
}

// Extract specific pages from a PDF buffer
async function extractPdfPages(pdfBuffer, startPage, endPage) {
  try {
    // Load the source PDF
    const srcPdfDoc = await PDFDocument.load(pdfBuffer);

    // Create a new PDF document
    const newPdfDoc = await PDFDocument.create();

    // Copy the specified pages
    const pageIndicesToCopy = [];
    for (let i = startPage; i <= endPage; i++) {
      if (i < srcPdfDoc.getPageCount()) {
        pageIndicesToCopy.push(i);
      }
    }

    // Copy pages from source to new document
    const copiedPages = await newPdfDoc.copyPages(srcPdfDoc, pageIndicesToCopy);
    copiedPages.forEach((page) => {
      newPdfDoc.addPage(page);
    });

    // Serialize the new PDF document to bytes
    const newPdfBytes = await newPdfDoc.save();

    return Buffer.from(newPdfBytes);
  } catch (error) {
    console.error("Error extracting PDF pages:", error);
    throw error;
  }
}

// Parse and clean JSON response
function parseJsonResponse(jsonText) {
  try {
    // Log the raw text response
    console.log(
      "Raw AI Response Text (First 1000 chars):",
      jsonText.slice(0, 1000)
    );

    // Log raw text length and first few characters
    console.log("Response Text Length:", jsonText.length);
    console.log("Response Text Start:", jsonText.slice(0, 200));

    // Parse the JSON response
    const drugs = JSON.parse(jsonText);

    // Validate and clean each drug object
    return drugs.map((drug) => ({
      name: drug.name || "",
      ingredients: drug.ingredients || "",
      registrationNumber: drug.registrationNumber || "",
      manufacturingRequirements: drug.manufacturingRequirements || "",
      unitOfMeasure: drug.unitOfMeasure || "",
      estimatedPrice: Number(drug.estimatedPrice) || 0,
      manufacturer: drug.manufacturer || "",
      distributor: drug.distributor || "",
      yearOfRegistration: drug.yearOfRegistration || "",
      countryOfOrigin: drug.countryOfOrigin || "",
      usageForm: drug.usageForm || "",
      contentOfReview: drug.contentOfReview || "",
      noProposalsOnPrice: drug.noProposalsOnPrice || "",
      dateOfProposolsOnPrice: drug.dateOfProposolsOnPrice || "",
      additionalNotes: drug.additionalNotes || "",
    }));
  } catch (parseError) {
    console.error("Error parsing JSON response:", parseError);

    // Fallback: Try to extract structured data if JSON parsing fails
    console.log("Attempting to extract structured data as fallback...");
    const fallbackData = extractStructuredData(jsonText);
    if (fallbackData.length > 0) {
      console.log("Show fallback Data:", fallbackData);
      return fallbackData;
    }

    // If all fails, throw error
    throw new Error(`Failed to parse response: ${parseError.message}`);
  }
}

// Fallback function to try to extract data if JSON parsing fails
function extractStructuredData(text) {
  try {
    // Look for patterns that might indicate JSON structure issues
    // Sometimes the model might wrap the array incorrectly or have formatting issues

    // Try to find array content
    const arrayMatch = text.match(/\[\s*\{.*\}\s*\]/s);
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]);
    }

    // Try to find individual objects
    const objects = [];
    const objectRegex = /\{\s*"name":\s*"[^"]*".*?\}/gs;
    let match;
    while ((match = objectRegex.exec(text)) !== null) {
      try {
        const obj = JSON.parse(match[0]);
        objects.push(obj);
      } catch (e) {
        // Skip invalid objects
      }
    }

    if (objects.length > 0) {
      return objects;
    }

    return [];
  } catch (e) {
    console.error("Fallback extraction failed:", e);
    return [];
  }
}
