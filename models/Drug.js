import mongoose from "mongoose";

const drugSchema = new mongoose.Schema({
  registrationNumber: { type: String, required: true },
  name: { type: String, required: true },
  ingredients: { type: String, required: true },
  cleanedIngredients: { type: [String], default: [] },
  manufacturingRequirements: { type: String },
  unitOfMeasure: { type: String },
  estimatedPrice: { type: Number },
  manufacturer: { type: String },
  distributor: { type: String },
  yearOfRegistration: { type: String },
  countryOfOrigin: { type: String },
  usageForm: { type: String },
  contentOfReview: { type: String },
  noProposalsOnPrice: { type: String },
  dateOfProposolsOnPrice: { type: String },
  additionalNotes: { type: String },
});

export default mongoose.model("Drug", drugSchema);
