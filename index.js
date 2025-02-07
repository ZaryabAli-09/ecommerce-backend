// Libraries imports
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";

// DB configuration middleware imports
import { dbConnection } from "./db/dbConnection.js";
import { errorMiddleware } from "./middlwares/errorMiddleware.js";

// Routes imports
import buyerAuthRoutes from "./routes/buyerAuth.routes.js";
import BuyerRoutes from "./routes/buyer.routes.js";
import SellerRoutes from "./routes/seller.routes.js";
import ProductRoutes from "./routes/product.routes.js";
import OrderRoutes from "./routes/order.routes.js";
import ReviewRoutes from "./routes/review.routes.js";
import CategoryRoutes from "./routes/category.routes.js";
import CartWishlistRoutes from "./routes/cart-wishlist.routes.js";
import SellerAuthRoutes from "./routes/sellerAuth.routes.js";
import AdminAuthRoutes from "./routes/adminAuth.routes.js";

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Define the port
const PORT = process.env.PORT || 5000;

// Built-in Middlewares
app.use(cors({ origin: "http://localhost:5173", credentials: true })); // When credentials: true is set, it means that cookies will be included in cross-origin requests made by your frontend applicati
app.use(express.json()); // Parsing JSON bodies
app.use(helmet()); // Security headers
app.use(cookieParser()); // Parse cookies from request headers
app.use(compression()); // Compress response bodies
// Middleware to handle json and urlencoded data for non-file routes

// Api testing route
app.get("/", (req, res) => {
  res.send("Ecommerce api is working");
});

// Auth Routes
app.use("/api/buyer/auth", buyerAuthRoutes);
app.use("/api/seller/auth", SellerAuthRoutes);
app.use("/api/auth/admin", AdminAuthRoutes);

app.use("/api/buyer", BuyerRoutes);
app.use("/api/seller", SellerRoutes);

app.use("/api/buyer", CartWishlistRoutes);
app.use("/api/product", ProductRoutes);
app.use("/api/product", ReviewRoutes);
app.use("/api/product", CategoryRoutes);
app.use("/api/order", OrderRoutes);

// Wildcard route for handling 404 errors
app.get("*", (req, res) => {
  res.status(404).json("not found");
});

// Error Middleware
app.use(errorMiddleware);

// Start the server and call MongoDB connection inside listen
app.listen(PORT, async () => {
  try {
    console.log(`Server running on port ${PORT}`);
    await dbConnection();
  } catch (error) {
    console.log(`Error starting server: ${error.message}`);
  }
});
