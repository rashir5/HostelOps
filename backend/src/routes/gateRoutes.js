const express = require("express");

const router = express.Router();

const gateController = require("../controllers/gateController");

router.post("/", gateController.createGateLog);

router.get("/", gateController.getAllGateLogs);

module.exports = router;