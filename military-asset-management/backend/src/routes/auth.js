import express from "express";
import { get } from "../database.js";
import { createToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/login", async (request, response) => {
  const { username, password } = request.body;

  if (!username || !password) {
    response.status(400).json({ message: "Username and password are required." });
    return;
  }

  const user = await get(
    "SELECT id, name, username, role, base, password FROM users WHERE username = ?",
    [username]
  );

  if (!user || user.password !== password) {
    response.status(401).json({ message: "Invalid credentials." });
    return;
  }

  response.json({
    token: createToken(user),
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      base: user.base
    }
  });
});

export default router;
