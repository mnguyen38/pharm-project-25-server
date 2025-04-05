import mongoose from "mongoose";

const drugCatalogSchema = new mongoose.Schema(
  {
    registrationNumber: {
      // Số đăng ký (Registration Number)
      type: String,
      required: true,
    },
    name: {
      // Tên thuốc
      type: String,
      // required: true,
    },
    ingredients: {
      // Tên hoạt chất - Raw unprocessed string
      type: String,
      // required: true,
    },
    cleanedIngredients: {
      // Array of cleaned/processed ingredients
      type: [String],
      default: [],
    },
    manufacturingRequirements: {
      // Quy cách đóng gói
      type: String,
      // required: false,
    },
    unitOfMeasure: {
      // Đơn vị tính đVT
      type: String,
      // required: false,
    },
    estimatedPrice: {
      // Giá dự kiến
      type: Number,
      // required: false,
    },
    manufacturer: {
      // Doanh nghiệp sản xuất
      type: String,
      // required: true,
    },
    distributor: {
      // Doanh nghiệp kê khai
      type: String,
      // required: true,
    },
    yearOfRegistration: {
      // Ngày tiếp nhận Hồ sơ kê khai
      type: String,
      // required: false,
    },
    countryOfOrigin: {
      // Nước sản xuất
      type: String,
      // required: true,
    },
    usageForm: {
      // Dạng bào chế
      type: String,
      // required: false,
    },
    contentOfReview: {
      // Nội dung rà soát
      type: String,
      // required: false,
    },
    noProposalsOnPrice: {
      // Số Văn bản kiến nghị về mức giá đã kê khai
      type: String,
      // required: false,
    },
    dateOfProposolsOnPrice: {
      // Ngày Văn bản kiến nghị về mức giá đã kê khai
      type: String,
      // required: false,
    },
    additionalNotes: {
      // Ghi chú
      type: String,
      // required: false,
    },
  },
  { collection: "DrugCatalog" }
);

export default drugCatalogSchema;
