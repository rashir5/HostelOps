const gateRoutes = require("./routes/gateRoutes");
const visitorRoutes = require("./routes/visitorRoutes");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get("/",(req,res)=>{
    res.json({
        message:"Welcome to HostelOps API",
        status: "Server Running Successfully"
    });
});
app.use("/api/visitors", visitorRoutes);
app.use("/api/gatelogs", gateRoutes);
module.exports = app;