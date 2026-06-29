import express from "express";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { OAuth2Client } from "google-auth-library";
import { getCollections } from "../config/db.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { generateToken } from "../utils/generateToken.js";
import { clearCookieOptions, cookieName, cookieOptions } from "../utils/cookieOptions.js";

const router = express.Router();

function sanitizeUser(user) {
  if (!user) return null;
  return { _id: user._id?.toString(), name: user.name, email: user.email, photoURL: user.photoURL || "", provider: user.provider, createdAt: user.createdAt };
}

function validatePassword(password) {
  return password?.length >= 6 && /[A-Z]/.test(password) && /[a-z]/.test(password);
}

router.get("/health", (req, res) => res.json({ success: true, message: "Auth routes are ready" }));

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, photoURL, password } = req.body;
    const { usersCollection } = getCollections();
    if (!name || !email || !photoURL || !password) return res.status(400).json({ success: false, message: "Name, email, photo URL and password are required." });
    if (!validatePassword(password)) return res.status(400).json({ success: false, message: "Password must be at least 6 characters and include uppercase and lowercase letters." });
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await usersCollection.findOne({ email: normalizedEmail });
    if (existingUser) return res.status(409).json({ success: false, message: "An account with this email already exists." });
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { name: name.trim(), email: normalizedEmail, photoURL: photoURL.trim(), provider: "credentials", password: hashedPassword, createdAt: new Date() };
    const result = await usersCollection.insertOne(newUser);
    const savedUser = { ...newUser, _id: result.insertedId };
    const token = generateToken(savedUser);
    res.cookie(cookieName, token, cookieOptions);
    res.status(201).json({ success: true, message: "Registration successful.", user: sanitizeUser(savedUser) });
  } catch (error) { next(error); }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { usersCollection } = getCollections();
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password are required." });
    const user = await usersCollection.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.password) return res.status(401).json({ success: false, message: "Invalid email or password." });
    const isPasswordMatched = await bcrypt.compare(password, user.password);
    if (!isPasswordMatched) return res.status(401).json({ success: false, message: "Invalid email or password." });
    const token = generateToken(user);
    res.cookie(cookieName, token, cookieOptions);
    res.json({ success: true, message: "Login successful.", user: sanitizeUser(user) });
  } catch (error) { next(error); }
});

router.post("/google", async (req, res, next) => {
  try {
    const { credential } = req.body;
    const { usersCollection } = getCollections();
    if (!credential) return res.status(400).json({ success: false, message: "Google credential is required." });
    if (!process.env.GOOGLE_CLIENT_ID) return res.status(500).json({ success: false, message: "GOOGLE_CLIENT_ID is missing on server." });
    const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload?.email_verified) return res.status(401).json({ success: false, message: "Google account verification failed." });
    const normalizedEmail = payload.email.toLowerCase().trim();
    let user = await usersCollection.findOne({ email: normalizedEmail });
    if (!user) {
      const newGoogleUser = { name: payload.name || "Google User", email: normalizedEmail, photoURL: payload.picture || "", provider: "google", createdAt: new Date() };
      const result = await usersCollection.insertOne(newGoogleUser);
      user = { ...newGoogleUser, _id: result.insertedId };
    } else {
      await usersCollection.updateOne({ _id: user._id }, { $set: { name: user.name || payload.name || "Google User", photoURL: user.photoURL || payload.picture || "" } });
      user = await usersCollection.findOne({ email: normalizedEmail });
    }
    const token = generateToken(user);
    res.cookie(cookieName, token, cookieOptions);
    res.json({ success: true, message: "Google login successful.", user: sanitizeUser(user) });
  } catch (error) { next(error); }
});

router.get("/me", verifyToken, async (req, res, next) => {
  try {
    const { usersCollection } = getCollections();
    let user = null;
    if (req.user?.id && ObjectId.isValid(req.user.id)) user = await usersCollection.findOne({ _id: new ObjectId(req.user.id) });
    if (!user && req.user?.email) user = await usersCollection.findOne({ email: req.user.email });
    if (!user) { res.clearCookie(cookieName, clearCookieOptions); return res.status(401).json({ success: false, message: "User not found. Please login again." }); }
    res.json({ success: true, user: sanitizeUser(user) });
  } catch (error) { next(error); }
});

router.post("/logout", (req, res) => {
  res.clearCookie(cookieName, clearCookieOptions);
  res.json({ success: true, message: "Logout successful." });
});

export default router;
