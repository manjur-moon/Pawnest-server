import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { connectDB } from "./src/config/db.js";
import authRoutes from "./src/routes/auth.routes.js";
import petRoutes from "./src/routes/pet.routes.js";
import requestRoutes from "./src/routes/request.routes.js";
import { errorHandler, notFoundHandler } from "./src/middlewares/errorHandler.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.set("trust proxy", 1);

const allowedOrigins = [
  "http://localhost:3000",
  process.env.CLIENT_URL,
  process.env.CLIENT_URL_2,
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    credentials: true,
  })
);

app.options("*", cors());
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({ success: true, message: "PawsNest server is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/pets", petRoutes);
app.use("/api/requests", requestRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  try {
    await connectDB();

    if (process.env.NODE_ENV !== "production") {
      app.listen(port, () => {
        console.log(`PawsNest server running on port ${port}`);
      });
    }
  } catch (error) {
    console.error("Failed to start server:", error.message);

    if (process.env.NODE_ENV !== "production") {
      process.exit(1);
    }
  }
}

startServer();

export default app;