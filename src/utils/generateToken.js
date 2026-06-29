import jwt from "jsonwebtoken";

export function generateToken(user) {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is missing in environment variables");
  return jwt.sign({ id: user._id?.toString(), name: user.name, email: user.email, photoURL: user.photoURL || "" }, process.env.JWT_SECRET, { expiresIn: "7d" });
}
