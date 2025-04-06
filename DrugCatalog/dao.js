import model from "./model.js";
import { cleanIngredients } from "../utils/cleanIngredients.js";
import * as canonicalIngredientsDao from "../CanonicalIngredients/dao.js";

export async function createDrugCatalog(drugs) {
  // Check if any drugs have _id fields
  const drugsWithIds = drugs.filter((drug) => drug._id);
  const drugsWithoutIds = drugs.filter((drug) => !drug._id);

  let insertedCount = 0;
  let skippedCount = 0;

  // Process drugs with IDs
  if (drugsWithIds.length > 0) {
    // Find existing _id values in the database
    const existingIds = await model
      .find(
        { _id: { $in: drugsWithIds.map((drug) => drug._id) } },
        { _id: 1 } // Only return the _id field
      )
      .then((docs) => docs.map((doc) => doc._id.toString()));

    // Filter out drugs with existing _id values
    const newDrugsWithIds = drugsWithIds.filter(
      (drug) => !existingIds.includes(drug._id.toString())
    );

    // Process and insert new drugs with IDs
    if (newDrugsWithIds.length > 0) {
      const processedDrugs = newDrugsWithIds.map(processDrugIngredients);
      const result = await model.insertMany(processedDrugs, { ordered: false });
      insertedCount += result.length;

      // Update canonical ingredients
      await updateCanonicalIngredientsFromDrugs(processedDrugs);
    }

    skippedCount += drugsWithIds.length - newDrugsWithIds.length;
  }

  // Process drugs without IDs (like from PDF parsing)
  if (drugsWithoutIds.length > 0) {
    try {
      const processedDrugs = drugsWithoutIds.map(processDrugIngredients);
      // Directly insert drugs without IDs - MongoDB will generate IDs
      const result = await model.insertMany(processedDrugs, { ordered: false });
      insertedCount += result.length;

      // Update canonical ingredients
      await updateCanonicalIngredientsFromDrugs(processedDrugs);
    } catch (error) {
      console.error("Error inserting drugs without IDs:", error);
      // If some failed validation, count them as skipped
      skippedCount += drugsWithoutIds.length;
    }
  }

  return {
    insertedCount,
    skippedCount,
  };
}

// Helper function to process ingredients for a drug
function processDrugIngredients(drug) {
  // Create a copy of the drug to avoid mutating the original
  const processedDrug = { ...drug };

  // Process ingredients if present
  if (
    processedDrug.ingredients &&
    typeof processedDrug.ingredients === "string"
  ) {
    processedDrug.cleanedIngredients = cleanIngredients(
      processedDrug.ingredients
    );
  } else {
    processedDrug.cleanedIngredients = [];
  }

  return processedDrug;
}

// Helper function to update canonical ingredients from processed drugs
async function updateCanonicalIngredientsFromDrugs(drugs) {
  // Extract all unique cleaned ingredients from the drugs
  const allIngredients = new Set();

  drugs.forEach((drug) => {
    if (drug.cleanedIngredients && Array.isArray(drug.cleanedIngredients)) {
      drug.cleanedIngredients.forEach((ingredient) => {
        if (ingredient) allIngredients.add(ingredient);
      });
    }
  });

  // Update canonical ingredients
  if (allIngredients.size > 0) {
    await canonicalIngredientsDao.updateCanonicalIngredients([
      ...allIngredients,
    ]);
  }
}

export async function findAllDrugCatalog({ page = 1, limit = 25 } = {}) {
  const skip = (page - 1) * limit;
  return model.find().skip(skip).limit(limit);
}

export async function countDrugCatalog() {
  return model.countDocuments();
}

export function findDrugCatalogById(id) {
  return model.findById(id);
}

export async function updateDrugCatalog(id, drugUpdates) {
  // Process ingredients if they were updated
  if (drugUpdates.ingredients) {
    drugUpdates.cleanedIngredients = cleanIngredients(drugUpdates.ingredients);

    // Update canonical ingredients
    if (drugUpdates.cleanedIngredients.length > 0) {
      await canonicalIngredientsDao.updateCanonicalIngredients(
        drugUpdates.cleanedIngredients
      );
    }
  }

  return model.updateOne({ _id: id }, drugUpdates);
}

export function deleteDrugCatalog(id) {
  return model.deleteOne({ _id: id });
}
