const Leave = require("../models/Leave");

// Apply Leave
const applyLeave = async (leaveData) => {
  return await Leave.create(leaveData);
};

// Get All Leaves
const getAllLeaves = async () => {
  return await Leave.find().sort({ createdAt: -1 });
};

// Get Leave By ID
const getLeaveById = async (id) => {
  return await Leave.findById(id);
};

// Approve or Reject Leave
const updateLeaveStatus = async (id, updateData) => {
  return await Leave.findByIdAndUpdate(
    id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );
};

module.exports = {
  applyLeave,
  getAllLeaves,
  getLeaveById,
  updateLeaveStatus,
};