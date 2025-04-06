import * as dao from "./dao.js";

export default function CanonicalIngredientsRoutes(app) {
  // Get all canonical ingredients
  app.get("/canonicalIngredients", async (req, res) => {
    try {
      const ingredients = await dao.findAllCanonicalIngredients();
      res.json(ingredients);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get top ingredients by usage count
  app.get("/canonicalIngredients/top", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const ingredients = await dao.getTopIngredients(limit);
      res.json(ingredients);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Search ingredients by pattern
  app.get("/canonicalIngredients/search", async (req, res) => {
    try {
      const pattern = req.query.q;
      if (!pattern) {
        return res.status(400).json({ error: "Search query is required" });
      }
      const ingredients = await dao.findCanonicalIngredientsByPattern(pattern);
      res.json(ingredients);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add new canonical ingredients
  app.post("/canonicalIngredients", async (req, res) => {
    try {
      // Handle both array inputs and single string inputs
      let newIngredients = Array.isArray(req.body) ? req.body : [req.body];

      // Convert string inputs to object format if needed
      newIngredients = newIngredients.map((ingredient) =>
        typeof ingredient === "string" ? { name: ingredient } : ingredient
      );

      // Normalize names (trim and convert to lowercase for comparison)
      newIngredients = newIngredients.map((ingredient) => ({
        ...ingredient,
        normalizedName: ingredient.name.trim().toLowerCase(),
      }));

      // Remove duplicates within the request itself
      const uniqueIngredients = [];
      const requestNormalizedNames = new Set();

      for (const ingredient of newIngredients) {
        if (!requestNormalizedNames.has(ingredient.normalizedName)) {
          requestNormalizedNames.add(ingredient.normalizedName);
          // Remove the temporary normalizedName field before sending to DAO
          const { normalizedName, ...cleanIngredient } = ingredient;
          uniqueIngredients.push(cleanIngredient);
        }
      }

      // Check for existing ingredients in the database
      const existingIngredients = await dao.findCanonicalIngredientsByNames(
        Array.from(requestNormalizedNames)
      );

      // Filter out ingredients that already exist in the database
      const existingNormalizedNames = new Set(
        existingIngredients.map((ing) => ing.name.toLowerCase().trim())
      );

      const ingredientsToAdd = uniqueIngredients.filter(
        (ing) => !existingNormalizedNames.has(ing.name.toLowerCase().trim())
      );

      // If no new ingredients to add, return early
      if (ingredientsToAdd.length === 0) {
        return res.json({
          message: "No new ingredients to add, all already exist",
          added: 0,
          total: existingIngredients.length,
        });
      }

      // Add the new ingredients
      const result = await dao.addCanonicalIngredients(ingredientsToAdd);

      res.status(201).json({
        message: "Ingredients added successfully",
        added: ingredientsToAdd.length,
        total: existingIngredients.length + ingredientsToAdd.length,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}
