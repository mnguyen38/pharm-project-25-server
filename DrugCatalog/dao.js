import model from "./model.js";

export async function createDrugCatalog(drugs) {
  // Find existing _id values in the database
  const existingIds = await model.find(
    { _id: { $in: drugs.map(drug => drug._id) } },
    { _id: 1 } // Only return the _id field
  ).then(docs => docs.map(doc => doc._id));

  // Filter out drugs with existing _id values
  const newDrugs = drugs.filter(drug => !existingIds.includes(drug._id));

  if (newDrugs.length === 0) {
    console.log('All records are duplicates. Skipping upload.');
    return { insertedCount: 0, skippedCount: drugs.length };
  }

  // Insert only non-duplicate drugs
  const result = await model.insertMany(newDrugs, { ordered: false });

  return {
    insertedCount: result.length,
    skippedCount: drugs.length - newDrugs.length,
  };
}

export function findAllDrugCatalog() {
  return model.find();
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