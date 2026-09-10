import express from "express";
import cors from "cors";
import helmet from "helmet";

import portfolioRoutes from "./routes/portfolio.routes.js";

const app = express();

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET"],
    allowedHeaders: ["Content-Type"]
  })
);

app.use(express.json({ limit: "100kb" }));

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Portfolio API is healthy",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/v1/portfolio", portfolioRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}]`, err);

  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
});

export default app;
