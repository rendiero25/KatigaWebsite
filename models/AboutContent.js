const mongoose = require("mongoose");

const aboutContentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "",
    },
    subtitle: {
      type: String,
      default: "",
    },
    images: [
      {
        type: String,
      },
    ],
    history: {
      type: String,
      default: "",
    },
    mission: {
      title: { type: String, default: "Mission" },
      points: [{ type: String }],
      backgroundImage: { type: String },
    },
    vision: {
      title: { type: String, default: "Vision" },
      content: { type: String, default: "" },
      backgroundImage: { type: String },
    },
  },
  { timestamps: true },
);

// Singleton Check
aboutContentSchema.pre("save", async function (next) {
  if (this.isNew) {
    const count = await mongoose.model("AboutContent").countDocuments();
    if (count > 0) {
      throw new Error(
        "Cannot create more than one AboutContent document. Use update instead.",
      );
    }
  }
  next();
});

module.exports = mongoose.model("AboutContent", aboutContentSchema);
