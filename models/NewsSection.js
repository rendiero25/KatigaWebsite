const mongoose = require("mongoose");

const newsSectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "Rangkuman berita dan sorotan utama yang relevan untuk Anda.",
    },
    subtitle: {
      type: String,
      default: "Certificates & Technologi",
    },
    bannerImage: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("NewsSection", newsSectionSchema);
