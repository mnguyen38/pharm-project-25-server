import mongoose from "mongoose";

const companyDetailsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
}, {collection: 'CompanyDetails'});

export default companyDetailsSchema;