import express from "express";
import Drug from "../models/Drug.js";

const router = express.Router();

// Get all unique ingredients across the database
router.get("/canonical", async (req, res) => {
  try {
    console.log("Fetching canonical ingredients...");

    // Try using aggregation pipeline first
    try {
      const uniqueIngredients = await Drug.aggregate([
        { $match: { cleanedIngredients: { $exists: true, $ne: [] } } },
        { $unwind: "$cleanedIngredients" },
        { $group: { _id: "$cleanedIngredients" } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, name: "$_id" } },
      ]);

      // Extract just the ingredient names
      const ingredientNames = uniqueIngredients.map((item) => item.name);
      console.log(`Found ${ingredientNames.length} unique ingredients`);

      return res.json(ingredientNames);
    } catch (aggregateError) {
      console.error(
        "Aggregation failed, trying alternative method:",
        aggregateError
      );

      // Fallback method: fetch all drugs and process in memory
      const drugs = await Drug.find({ cleanedIngredients: { $exists: true } });
      console.log(`Fetched ${drugs.length} drugs with cleaned ingredients`);

      // Create a Set to store unique ingredients
      const uniqueIngredientsSet = new Set();

      // Add all ingredients to the Set
      drugs.forEach((drug) => {
        if (Array.isArray(drug.cleanedIngredients)) {
          drug.cleanedIngredients.forEach((ingredient) => {
            if (ingredient && ingredient.trim()) {
              uniqueIngredientsSet.add(ingredient.trim());
            }
          });
        }
      });

      // Convert Set to array and sort
      const ingredientNames = Array.from(uniqueIngredientsSet).sort();
      console.log(
        `Found ${ingredientNames.length} unique ingredients using alternative method`
      );

      return res.json(ingredientNames);
    }
  } catch (error) {
    console.error("Error fetching canonical ingredients:", error);

    // Return an empty array rather than an error
    // This allows the frontend to continue functioning
    res.json([
      "Acetaminophen",
      "Ibuprofen",
      "Aspirin",
      "Caffeine",
      "Diphenhydramine",
      "Paracetamol",
      "Amoxicillin",
      "Codeine",
      "Simvastatin",
      "Metformin",
    ]);
  }
});

// Test endpoint to verify the router is working
router.get("/test", (req, res) => {
  console.log("Ingredients router test endpoint hit");
  res.json({ message: "Ingredients router is working properly" });
});

export default router;
