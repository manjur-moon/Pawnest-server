import jwt from "jsonwebtoken";
import { cookieName } from "../utils/cookieOptions.js";

export function verifyToken(req, res, next) {
  try {
    const token = req.cookies?.[cookieName];
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized access. Please login first." });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token. Please login again." });
  }
}
