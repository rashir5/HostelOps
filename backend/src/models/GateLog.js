const mongoose = require("mongoose");

const gateLogSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
      trim: true,
    },

    gateNumber: {
      type: String,
      required: true,
      trim: true,
    },

    entryType: {
      type: String,
      enum: ["ENTRY", "EXIT"],
      required: true,
    },

    entryTime: {
      type: Date,
      default: null,
    },

    exitTime: {
      type: Date,
      default: null,
    },

    verifiedBy: {
      type: String,
      required: true,
      trim: true,
    },

    remarks: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("GateLog", gateLogSchema);