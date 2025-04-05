import model from "./model.js";

/**
 * Updates the canonical ingredients list with new ingredients
 * @param {string[]} ingredients - Array of ingredient names
 * @returns {Promise<Object>} - Result of the operation
 */
export async function updateCanonicalIngredients(ingredients) {
  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    return { added: 0, updated: 0 };
  }

  let added = 0;
  let updated = 0;
  const now = new Date();

  // Process each ingredient
  for (const name of ingredients) {
    // Skip empty names
    if (!name.trim()) continue;

    // Try to update existing ingredient first
    const updateResult = await model.updateOne(
      { name },
      {
        $inc: { count: 1 },
        $set: { lastSeenDate: now },
      }
    );

    // If no document was modified, ingredient is new
    if (updateResult.modifiedCount === 0) {
      await model.create({
        name,
        count: 1,
        firstSeenDate: now,
        lastSeenDate: now,
      });
      added++;
    } else {
      updated++;
    }
  }

  return { added, updated };
}

/**
 * Retrieves all canonical ingredients
 * @returns {Promise<Array>} - Array of canonical ingredients
 */
export function findAllCanonicalIngredients() {
  return model.find().sort({ count: -1 });
}

/**
 * Finds canonical ingredients by name pattern
 * @param {string} namePattern - Pattern to match ingredient names
 * @returns {Promise<Array>} - Matching ingredients
 */
export function findCanonicalIngredientsByPattern(namePattern) {
  const regex = new RegExp(namePattern, "i");
  return model.find({ name: regex }).sort({ count: -1 });
}

/**
 * Gets the top used ingredients
 * @param {number} limit - Number of ingredients to retrieve
 * @returns {Promise<Array>} - Top ingredients
 */
export function getTopIngredients(limit = 20) {
  return model.find().sort({ count: -1 }).limit(limit);
}
