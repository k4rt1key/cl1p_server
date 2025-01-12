require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const connectDB = require("./config/db");
const cl1pRoutes = require("./routes/cl1p");
const cors = require('cors')
require("./jobs/cleanup");

const app = express();

app.use(
    cors({
      origin: 'http://localhost:3000', // Allow requests from this origin
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allow these HTTP methods
      allowedHeaders: ['Content-Type', 'Authorization'], // Allow these headers
      credentials: true, // Allow cookies or credentials
    })
  );

// Middleware
app.use(bodyParser.json());
app.use("/api/cl1p", cl1pRoutes);

// Connect to database
connectDB();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
