import mongoose from "mongoose";

async function dbConnection() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {});
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log("Failed to connect to MongoDB");
  }
}

export { dbConnection };
