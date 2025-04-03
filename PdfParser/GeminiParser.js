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
  try {
    const pdfResp = fs.readFileSync(pdfFilePath);
    
    // Specialized prompt for Vietnamese pharmaceutical registration documents
    // Requesting direct JSON output instead of CSV
    const pdfParsingPrompt = `
    You are an expert pharmaceutical data extraction specialist. Extract structured information from this Vietnamese pharmaceutical drug registration document from the Ministry of Health (Bộ Y Tế). This document lists approved medications with detailed attributes in a tabular format.

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
    BE COMPLETELY SURE YOU PARSE EVERY SINGLE PAGE OF THE PDF.
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
    
    const jsonText = result.response.text();
    const parsePdfResponse = async (jsonText) => {
      // Log the raw text response
      console.log("Raw AI Response Text (First 1000 chars):", jsonText.slice(0, 1000));
      
      // Log raw text length and first few characters
      console.log("Response Text Length:", jsonText.length);
      console.log("Response Text Start:", jsonText.slice(0, 200)); }
    
    try {
      // Parse the JSON response
      const drugs = JSON.parse(jsonText);

      
      
      // Validate and clean each drug object
      return drugs.map(drug => ({
        name: drug.name || '',
        ingredients: drug.ingredients || '',
        registrationNumber: drug.registrationNumber || '',
        manufacturingRequirements: drug.manufacturingRequirements || '',
        unitOfMeasure: drug.unitOfMeasure || '',
        estimatedPrice: Number(drug.estimatedPrice) || 0,
        manufacturer: drug.manufacturer || '',
        distributor: drug.distributor || '',
        yearOfRegistration: drug.yearOfRegistration || '',
        countryOfOrigin: drug.countryOfOrigin || '',
        usageForm: drug.usageForm || '',
        contentOfReview: drug.contentOfReview || '',
        noProposalsOnPrice: drug.noProposalsOnPrice || '',
        dateOfProposolsOnPrice: drug.dateOfProposolsOnPrice || '',
        additionalNotes: drug.additionalNotes || ''
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
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error(`Failed to parse PDF: ${error.message}`);
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