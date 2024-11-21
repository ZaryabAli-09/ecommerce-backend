import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { dbConnection } from "./db/dbConnection.js";
import helmet from "helmet";
import compression from "compression";
import AuthRoutes from "./routes/auth.routes.js";
import UserRoutes from "./routes/user.routes.js";
import ProductRoutes from "./routes/product.routes.js";
import OrderRoutes from "./routes/order.routes.js";
import ReviewRoutes from "./routes/review.routes.js";
import CategoryRoutes from "./routes/category.routes.js";
// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Define the port
const PORT = process.env.PORT || 5000;

// Built-in Middlewares
app.use(express.json()); // Parsing JSON bodies
app.use(helmet()); // Security headers
app.use(cookieParser()); // Parse cookies from request headers
app.use(compression()); // Compress response bodies
app.use(cors({ origin: "http://localhost:5173", credentials: true })); // When credentials: true is set, it means that cookies will be included in cross-origin requests made by your frontend applicati

// Routes
app.get("/", (req, res) => {
  res.send("Ecommerce api is working");
});
app.use("/api/auth", AuthRoutes);

app.use("/api/users", UserRoutes);

app.use("/api/product", ProductRoutes);
app.use("/api/product", ReviewRoutes);
app.use("/api/product", CategoryRoutes);

app.use("/api/order", OrderRoutes);

// Wildcard route for handling 404 errors
app.get("*", (req, res) => {
  res.status(404).json("not found");
});

// catchError Middleware only for catch block
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});

// Start the server and call MongoDB connection inside listen
app.listen(PORT, async () => {
  try {
    console.log(`Server running on port ${PORT}`);
    await dbConnection();
  } catch (error) {
    console.log(`Error starting server: ${error.message}`);
  }
});
