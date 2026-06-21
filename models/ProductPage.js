const mongoose = require("mongoose");

const productPageSchema = new mongoose.Schema(
  {
    subtitle: {
      type: String,
      default: "",
    },
    title: {
      type: String,
      default: "",
    },
    bannerImage: {
      type: String,
      default: "",
    },
    category1: {
      name: { type: String, default: "" },
      subtitle: { type: String, default: "" },
      title: { type: String, default: "" },
    },
    category2: {
      name: { type: String, default: "" },
      subtitle: { type: String, default: "" },
      title: { type: String, default: "" },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ProductPage", productPageSchema);
