import "dotenv/config";

import app from "./app.js";

const PORT = Number(process.env.PORT || 5000);

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("Invalid PORT in environment");
}

const server = app.listen(PORT, () => {
  console.log(`Portfolio API running on http://localhost:${PORT}`);
});

const shutdown = (signal) => {
  console.log(`${signal} received. Shutting down server...`);

  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Forced shutdown.");
    process.exit(1);
  }, 10000).unref();
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
