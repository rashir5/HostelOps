const InstitutionSetting = require('../models/InstitutionSetting.model');
const AuditLog = require('../models/AuditLog.model');

// Public endpoint: get current institutional settings & mess plans
const getSettings = async (_req, res, next) => {
  try {
    let settings = await InstitutionSetting.findOne();
    if (!settings) {
      settings = await InstitutionSetting.create({
        institutionName: "Bharatiya Vidya Bhavan's Sardar Patel Institute of Technology (SPIT)",
        campusAddress: "Munshi Nagar, Andheri (West), Mumbai – 400 058",
        contactEmail: "hostel@spit.ac.in",
        contactPhone: "+91 (022) 2670 7440",
        messOptions: [
          {
            name: "Regular Vegetarian Mess",
            monthlyFee: 3800,
            mealCoverage: "Breakfast, Lunch, Dinner",
            description: "Nutritious daily vegetarian meals managed under SPIT supervision.",
            isActive: true,
          },
          {
            name: "Special Mess (Veg + Non-Veg Days)",
            monthlyFee: 4600,
            mealCoverage: "Breakfast, Lunch, Dinner + Weekend Special Menu",
            description: "Vegetarian with approved non-veg specials on designated days.",
            isActive: true,
          },
        ],
        verifiedHostelFacilities: [
          { name: "WiFi Enabled Rooms", description: "Campus-wide fiber connectivity", available: true },
          { name: "Solar Water Heaters", description: "Eco-friendly 24x7 hot water supply", available: true },
          { name: "RO Water Purifiers", description: "Multi-stage drinking water filtration on every floor", available: true },
          { name: "Study Hall & Reading Room", description: "Quiet study zones open until midnight", available: true },
          { name: "24x7 Security & CCTV", description: "Gated entry, security guards, CCTV surveillance", available: true },
          { name: "Indoor Sports Room", description: "Table tennis, carrom, chess", available: true },
        ],
        academicYearsSupported: ['2024-25', '2025-26', '2026-27'],
      });
    }

    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

// Admin endpoint: update mess options and settings through UI forms (also directly editable via MongoDB Compass)
const updateSettings = async (req, res, next) => {
  try {
    const { messOptions, verifiedHostelFacilities, gateTimings, hostelNotice, academicYearCurrent } = req.body;

    let settings = await InstitutionSetting.findOne();
    if (!settings) {
      settings = new InstitutionSetting();
    }

    if (messOptions) settings.messOptions = messOptions;
    if (verifiedHostelFacilities) settings.verifiedHostelFacilities = verifiedHostelFacilities;
    if (gateTimings) settings.gateTimings = gateTimings;
    if (hostelNotice) settings.hostelNotice = hostelNotice;
    if (academicYearCurrent) settings.academicYearCurrent = academicYearCurrent;

    await settings.save();

    await AuditLog.create({
      action: 'Institution Settings Updated',
      performedBy: req.user._id,
      performedByName: req.user.name,
      role: req.user.role,
      targetType: 'InstitutionSetting',
      details: 'Updated mess options, gate timings or facility configurations',
    });

    res.json({
      success: true,
      message: 'Institution settings updated successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
