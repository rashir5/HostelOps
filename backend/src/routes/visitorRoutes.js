const express = require("express");
const router = express.Router();

const visitorController = require("../controllers/visitorController");

router.post("/", visitorController.createVisitor);

module.exports = router;