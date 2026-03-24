import jwt from "jsonwebtoken";
import { get } from "../database.js";

const SECRET = "military-asset-management-secret";

export function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      base: user.base,
      name: user.name
    },
    SECRET,
    { expiresIn: "8h" }
  );
}

export async function authenticate(request, response, next) {
  const header = request.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    response.status(401).json({ message: "Authentication token is required." });
    return;
  }

  try {
    const payload = jwt.verify(header.replace("Bearer ", ""), SECRET);
    const user = await get(
      "SELECT id, name, username, role, base FROM users WHERE id = ?",
      [payload.id]
    );

    if (!user) {
      response.status(401).json({ message: "User not found." });
      return;
    }

    request.user = user;
    next();
  } catch (error) {
    response.status(401).json({ message: "Invalid or expired token." });
  }
}

export function authorize(...roles) {
  return (request, response, next) => {
    if (!roles.includes(request.user.role)) {
      response.status(403).json({ message: "You do not have access to this resource." });
      return;
    }

    next();
  };
}
