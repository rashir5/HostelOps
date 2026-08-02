const Visitor = require("../models/Visitor");

const createVisitor = async (visitorData) => {
  const visitor = await Visitor.create(visitorData);
  return visitor;
};

module.exports = {
  createVisitor,
};