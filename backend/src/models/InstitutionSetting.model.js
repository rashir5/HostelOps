const mongoose = require('mongoose');

const messOptionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  monthlyFee: { type: Number, required: true },
  mealCoverage: { type: String, required: true },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
});

const institutionSettingSchema = new mongoose.Schema(
  {
    institutionName: {
      type: String,
      default: "Bharatiya Vidya Bhavan's Sardar Patel Institute of Technology (SPIT)",
    },
    campusAddress: {
      type: String,
      default: "Munshi Nagar, Andheri (West), Mumbai – 400 058",
    },
    contactEmail: {
      type: String,
      default: "hostel@spit.ac.in",
    },
    contactPhone: {
      type: String,
      default: "+91 (022) 2670 7440",
    },
    verifiedHostelFacilities: [
      {
        name: String,
        description: String,
        available: { type: Boolean, default: true },
      },
    ],
    messOptions: [messOptionSchema],
    academicYearCurrent: {
      type: String,
      default: "2024-25",
    },
    academicYearsSupported: [
      { type: String },
    ],
    gateTimings: {
      curfewWeekday: { type: String, default: "10:00 PM" },
      curfewWeekend: { type: String, default: "10:30 PM" },
      morningOpening: { type: String, default: "06:00 AM" },
    },
    hostelNotice: {
      type: String,
      default: "Hostel capacity, availability and mess plans are managed directly by the SPIT administration.",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InstitutionSetting', institutionSettingSchema);
