import model from "./model.js";

export async function createDrugCatalog(drugs) {
  // Check if any drugs have _id fields
  const drugsWithIds = drugs.filter(drug => drug._id);
  const drugsWithoutIds = drugs.filter(drug => !drug._id);
  
  let insertedCount = 0;
  let skippedCount = 0;
  
  // Process drugs with IDs
  if (drugsWithIds.length > 0) {
    // Find existing _id values in the database
    const existingIds = await model.find(
      { _id: { $in: drugsWithIds.map(drug => drug._id) } },
      { _id: 1 } // Only return the _id field
    ).then(docs => docs.map(doc => doc._id.toString()));

    // Filter out drugs with existing _id values
    const newDrugsWithIds = drugsWithIds.filter(drug => !existingIds.includes(drug._id.toString()));
    
    if (newDrugsWithIds.length > 0) {
      const result = await model.insertMany(newDrugsWithIds, { ordered: false });
      insertedCount += result.length;
    }
    
    skippedCount += drugsWithIds.length - newDrugsWithIds.length;
  }
  
  // Process drugs without IDs (like from PDF parsing)
  if (drugsWithoutIds.length > 0) {
    try {
      // Directly insert drugs without IDs - MongoDB will generate IDs
      const result = await model.insertMany(drugsWithoutIds, { ordered: false });
      insertedCount += result.length;
    } catch (error) {
      console.error('Error inserting drugs without IDs:', error);
      // If some failed validation, count them as skipped
      skippedCount += drugsWithoutIds.length;
    }
  }

  return {
    insertedCount,
    skippedCount,
  };
}

export function findAllDrugCatalog({ page = 1, limit = 25 } = {}) {
  const skip = (page - 1) * limit;
  return model.find().skip(skip).limit(limit);
}

export function findDrugCatalogById(id) {
  return model.findById(id);
}

export function updateDrugCatalog(id, drugUpdates) {
  return model.updateOne({ _id: id }, drugUpdates);
}

export function deleteDrugCatalog(id) {
  return model.deleteOne({ _id: id });
}