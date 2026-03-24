import cors from "cors";
import express from "express";
import { all, databasePath, initializeDatabase, seedDatabase } from "./database.js";
import { authenticate, authorize } from "./middleware/auth.js";
import assetsRouter from "./routes/assets.js";
import assignmentsRouter from "./routes/assignments.js";
import authRouter from "./routes/auth.js";
import purchasesRouter from "./routes/purchases.js";
import transfersRouter from "./routes/transfers.js";

const app = express();
const port = 5000;
const asyncHandler =
  (handler) =>
  (request, response, next) =>
    Promise.resolve(handler(request, response, next)).catch(next);

app.use(
  cors({
    origin: "http://localhost:5173"
  })
);
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/assets", authenticate, assetsRouter);
app.use("/api/purchases", authenticate, authorize("admin", "logistics"), purchasesRouter);
app.use("/api/transfers", authenticate, authorize("admin", "commander", "logistics"), transfersRouter);
app.use("/api/assignments", authenticate, authorize("admin", "commander", "logistics"), assignmentsRouter);

app.get(
  "/api/users",
  authenticate,
  authorize("admin"),
  asyncHandler(async (_request, response) => {
    const users = await all("SELECT id, name, username, role, base FROM users ORDER BY role, name");
    response.json(users);
  })
);

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ message: "Internal server error." });
});

async function startServer() {
  await initializeDatabase();
  await seedDatabase();

  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`SQLite database: ${databasePath}`);
  });
}

startServer();
