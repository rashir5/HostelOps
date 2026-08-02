const leaveService = require("../services/leaveService");

// Apply Leave
const applyLeave = async (req, res) => {
  try {
    const leave = await leaveService.applyLeave(req.body);

    res.status(201).json({
      success: true,
      message: "Leave applied successfully",
      data: leave,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// Get All Leaves
const getAllLeaves = async (req, res) => {

  try {

    const leaves = await leaveService.getAllLeaves();

    res.json({
      success: true,
      data: leaves,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

// Update Status
const updateLeaveStatus = async (req, res) => {

  try {

    const leave = await leaveService.updateLeaveStatus(
      req.params.id,
      req.body
    );

    res.json({
      success: true,
      message: "Leave Updated Successfully",
      data: leave,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

module.exports = {
  applyLeave,
  getAllLeaves,
  updateLeaveStatus,
};