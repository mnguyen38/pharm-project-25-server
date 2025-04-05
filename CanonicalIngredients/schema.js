import mongoose from "mongoose";

const canonicalIngredientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    count: {
      type: Number,
      default: 1,
    },
    firstSeenDate: {
      type: Date,
      default: Date.now,
    },
    lastSeenDate: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: "CanonicalIngredients" }
);

export default canonicalIngredientSchema;
