const GateLog = require("../models/GateLog");

// Record Entry or Exit
const createGateLog = async (gateData) => {
  const gateLog = await GateLog.create(gateData);
  return gateLog;
};

// Get All Gate Logs
const getAllGateLogs = async () => {
  return await GateLog.find().sort({ createdAt: -1 });
};

module.exports = {
  createGateLog,
  getAllGateLogs,
};