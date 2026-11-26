import express from "express";
import "dotenv/config";
import cors from "cors";
import mongoose from "mongoose";
import chatRoutes from "./routes/chats.js";

import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());

app.use("/api", chatRoutes);

app.listen(PORT, () => {
  console.log(`server running on ${PORT}`);
  connectDB();
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected to  database");
  } catch (err) {
    console.log("Failed to connect with DB", err);
  }
};
