import mongoose from "mongoose";
import drugCatalogSchema from "./schema.js";
const model = mongoose.model("DrugCatalogModel", drugCatalogSchema);
export default model;