const express = require("express");

const router = express.Router();

const leaveController = require("../controllers/leaveController");

router.post("/", leaveController.applyLeave);

router.get("/", leaveController.getAllLeaves);

router.put("/:id", leaveController.updateLeaveStatus);

module.exports = router;