import mongoose from "mongoose";

const drugInformationSchema = new mongoose.Schema({
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
}, {collection: 'DrugInformation'});

export default drugInformationSchema;