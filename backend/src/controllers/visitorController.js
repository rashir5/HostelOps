const visitorService = require("../services/visitorService");

const createVisitor = async (req, res) => {
  try {
    const visitor = await visitorService.createVisitor(req.body);

    res.status(201).json({
      success: true,
      message: "Visitor created successfully",
      data: visitor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createVisitor,
};