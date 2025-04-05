import mongoose from "mongoose";
import canonicalIngredientSchema from "./schema.js";
const model = mongoose.model(
  "CanonicalIngredientModel",
  canonicalIngredientSchema
);
export default model;
