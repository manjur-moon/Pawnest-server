import express from "express";
import { ObjectId } from "mongodb";
import { getCollections } from "../config/db.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();
const isValidObjectId = (id) => ObjectId.isValid(id);

router.get("/health", (req, res) => res.json({ success: true, message: "Request routes are ready" }));

router.post("/", verifyToken, async (req, res, next) => {
  try {
    const { petId, pickupDate, message } = req.body;
    const { petsCollection, requestsCollection } = getCollections();
    if (!petId || !pickupDate || !message) return res.status(400).json({ success: false, message: "Pet ID, pickup date and message are required." });
    if (!isValidObjectId(petId)) return res.status(400).json({ success: false, message: "Invalid pet id." });
    if (message.trim().length < 10) return res.status(400).json({ success: false, message: "Message should be at least 10 characters." });
    const pet = await petsCollection.findOne({ _id: new ObjectId(petId) });
    if (!pet) return res.status(404).json({ success: false, message: "Pet not found." });
    if (pet.ownerEmail === req.user.email) return res.status(403).json({ success: false, message: "Pet owners cannot submit adoption requests for their own pets." });
    if (pet.status === "adopted") return res.status(409).json({ success: false, message: "This pet has already been adopted." });
    const existingRequest = await requestsCollection.findOne({ petId, requesterEmail: req.user.email, status: { $in: ["pending", "approved"] } });
    if (existingRequest) return res.status(409).json({ success: false, message: "You already have a pending or approved adoption request for this pet." });
    const newRequest = { petId, petName: pet.petName, petImage: pet.image, ownerEmail: pet.ownerEmail, requesterName: req.user.name, requesterEmail: req.user.email, pickupDate, message: message.trim(), status: "pending", createdAt: new Date(), updatedAt: new Date() };
    const result = await requestsCollection.insertOne(newRequest);
    res.status(201).json({ success: true, message: "Adoption request submitted successfully.", request: { ...newRequest, _id: result.insertedId } });
  } catch (error) { next(error); }
});

router.get("/my-requests", verifyToken, async (req, res, next) => {
  try {
    const { requestsCollection } = getCollections();
    const requests = await requestsCollection.find({ requesterEmail: req.user.email }).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, count: requests.length, requests });
  } catch (error) { next(error); }
});

router.get("/pet/:petId", verifyToken, async (req, res, next) => {
  try {
    const { petId } = req.params;
    const { petsCollection, requestsCollection } = getCollections();
    if (!isValidObjectId(petId)) return res.status(400).json({ success: false, message: "Invalid pet id." });
    const pet = await petsCollection.findOne({ _id: new ObjectId(petId) });
    if (!pet) return res.status(404).json({ success: false, message: "Pet not found." });
    if (pet.ownerEmail !== req.user.email) return res.status(403).json({ success: false, message: "Only the pet owner can view adoption requests." });
    const requests = await requestsCollection.find({ petId }).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, pet, count: requests.length, requests });
  } catch (error) { next(error); }
});

router.patch("/:id/approve", verifyToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { petsCollection, requestsCollection } = getCollections();
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid request id." });
    const request = await requestsCollection.findOne({ _id: new ObjectId(id) });
    if (!request) return res.status(404).json({ success: false, message: "Adoption request not found." });
    const pet = await petsCollection.findOne({ _id: new ObjectId(request.petId) });
    if (!pet) return res.status(404).json({ success: false, message: "Pet not found." });
    if (pet.ownerEmail !== req.user.email) return res.status(403).json({ success: false, message: "Only the pet owner can approve this request." });
    if (request.status !== "pending") return res.status(400).json({ success: false, message: "Only pending requests can be approved." });
    if (pet.status === "adopted") return res.status(409).json({ success: false, message: "This pet has already been adopted." });
    await requestsCollection.updateOne({ _id: new ObjectId(id) }, { $set: { status: "approved", updatedAt: new Date() } });
    await petsCollection.updateOne({ _id: new ObjectId(request.petId) }, { $set: { status: "adopted", updatedAt: new Date() } });
    await requestsCollection.updateMany({ petId: request.petId, _id: { $ne: new ObjectId(id) }, status: "pending" }, { $set: { status: "rejected", updatedAt: new Date() } });
    res.json({ success: true, message: "Request approved. The pet is now marked as adopted and other pending requests were rejected." });
  } catch (error) { next(error); }
});

router.patch("/:id/reject", verifyToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { petsCollection, requestsCollection } = getCollections();
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid request id." });
    const request = await requestsCollection.findOne({ _id: new ObjectId(id) });
    if (!request) return res.status(404).json({ success: false, message: "Adoption request not found." });
    const pet = await petsCollection.findOne({ _id: new ObjectId(request.petId) });
    if (!pet) return res.status(404).json({ success: false, message: "Pet not found." });
    if (pet.ownerEmail !== req.user.email) return res.status(403).json({ success: false, message: "Only the pet owner can reject this request." });
    if (request.status !== "pending") return res.status(400).json({ success: false, message: "Only pending requests can be rejected." });
    await requestsCollection.updateOne({ _id: new ObjectId(id) }, { $set: { status: "rejected", updatedAt: new Date() } });
    res.json({ success: true, message: "Adoption request rejected." });
  } catch (error) { next(error); }
});

router.delete("/:id", verifyToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { requestsCollection } = getCollections();
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid request id." });
    const request = await requestsCollection.findOne({ _id: new ObjectId(id) });
    if (!request) return res.status(404).json({ success: false, message: "Adoption request not found." });
    if (request.requesterEmail !== req.user.email) return res.status(403).json({ success: false, message: "Only the requester can cancel this request." });
    if (request.status === "approved") return res.status(400).json({ success: false, message: "Approved requests cannot be cancelled." });
    await requestsCollection.deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true, message: "Adoption request cancelled successfully." });
  } catch (error) { next(error); }
});

export default router;
