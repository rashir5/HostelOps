const gateService = require("../services/gateService");

// Create Gate Log
const createGateLog = async (req, res) => {
  try {
    const gateLog = await gateService.createGateLog(req.body);

    res.status(201).json({
      success: true,
      message: "Gate log created successfully",
      data: gateLog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All Gate Logs
const getAllGateLogs = async (req, res) => {
  try {
    const gateLogs = await gateService.getAllGateLogs();

    res.status(200).json({
      success: true,
      data: gateLogs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createGateLog,
  getAllGateLogs,
};