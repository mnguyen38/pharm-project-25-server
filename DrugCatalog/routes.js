import * as dao from './dao.js';

export default function DrugCatalogRoutes(app) {
  app.post('/drugCatalog', async (req, res) => {
    try {
      const drugs = req.body;
      const result = await dao.createDrugCatalog(drugs);

      res.status(201).json({
        message: 'Upload completed',
        insertedCount: result.insertedCount,
        skippedCount: result.skippedCount,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/drugCatalog', async (req, res) => {
    try {
      const drugs = await dao.findAllDrugCatalog();
      res.json(drugs);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/drugCatalog/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const drug = await dao.findDrugCatalogById(id);
      if (drug) {
        res.json(drug);
      } else {
        res.status(404).json({ error: 'Drug not found' });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/drugCatalog/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const drugUpdates = req.body;
      const drug = await dao.updateDrugCatalog(id, drugUpdates);
      if (drug) {
        res.json(drug);
      } else {
        res.status(404).json({ error: 'Drug not found' });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/drugCatalog/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const drug = await dao.deleteDrugCatalog(id);
      if (drug) {
        res.json(drug);
      } else {
        res.status(404).json({ error: 'Drug not found' });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
}