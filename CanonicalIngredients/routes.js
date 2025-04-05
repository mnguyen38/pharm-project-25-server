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
}
