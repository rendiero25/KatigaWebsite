const mongoose = require("mongoose");

const certificationTechnologySchema = new mongoose.Schema(
  {
    header: {
      title: { type: String, default: "" },
      subtitle: { type: String, default: "" },
    },
    section1: {
      title: { type: String, default: "" }, // e.g., SNI & K3L
      image: { type: String, default: "" },
      points: [
        {
          title: { type: String, required: true },
          description: { type: String, required: true },
        },
      ],
    },
    section2: {
      title: { type: String, default: "" },
      subtitle: { type: String, default: "" }, // FROM FOREST...
      image: { type: String, default: "" },
      points: [{ type: String }],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "CertificationTechnology",
  certificationTechnologySchema,
);
