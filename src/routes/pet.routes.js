import express from "express";
import { ObjectId } from "mongodb";
import { getCollections } from "../config/db.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();
const isValidObjectId = (id) => ObjectId.isValid(id);

function normalizePetPayload(body) {
  return { petName: body.petName?.trim(), species: body.species?.trim(), breed: body.breed?.trim(), age: Number(body.age), gender: body.gender?.trim(), image: body.image?.trim(), healthStatus: body.healthStatus?.trim(), vaccinationStatus: body.vaccinationStatus?.trim(), location: body.location?.trim(), adoptionFee: Number(body.adoptionFee), description: body.description?.trim() };
}

function validatePetPayload(pet) {
  const requiredFields = ["petName", "species", "breed", "age", "gender", "image", "healthStatus", "vaccinationStatus", "location", "adoptionFee", "description"];
  for (const field of requiredFields) if (pet[field] === undefined || pet[field] === null || pet[field] === "" || Number.isNaN(pet[field])) return `${field} is required.`;
  if (pet.age < 0) return "Age cannot be negative.";
  if (pet.adoptionFee < 0) return "Adoption fee cannot be negative.";
  return null;
}

router.get("/health", (req, res) => res.json({ success: true, message: "Pet routes are ready" }));

router.get("/", async (req, res, next) => {
  try {
    const { petsCollection } = getCollections();
    const { search = "", species = "", sort = "" } = req.query;
    const query = {};
    if (search) query.petName = { $regex: search, $options: "i" };
    if (species) {
      const speciesArray = species.split(",").map((item) => item.trim()).filter(Boolean);
      if (speciesArray.length > 0) query.species = { $in: speciesArray };
    }
    let sortOption = { createdAt: -1 };
    if (sort === "fee-low") sortOption = { adoptionFee: 1 };
    if (sort === "fee-high") sortOption = { adoptionFee: -1 };
    if (sort === "newest") sortOption = { createdAt: -1 };
    const pets = await petsCollection.find(query).sort(sortOption).toArray();
    res.json({ success: true, count: pets.length, pets });
  } catch (error) { next(error); }
});

router.get("/featured", async (req, res, next) => {
  try {
    const { petsCollection } = getCollections();
    const pets = await petsCollection.find({ status: "available" }).sort({ createdAt: -1 }).limit(6).toArray();
    res.json({ success: true, count: pets.length, pets });
  } catch (error) { next(error); }
});

router.get("/owner/my-listings", verifyToken, async (req, res, next) => {
  try {
    const { petsCollection } = getCollections();
    const pets = await petsCollection.find({ ownerEmail: req.user.email }).sort({ createdAt: -1 }).toArray();
    const totalListings = pets.length;
    const available = pets.filter((pet) => pet.status === "available").length;
    const adopted = pets.filter((pet) => pet.status === "adopted").length;
    res.json({ success: true, stats: { totalListings, available, adopted }, pets });
  } catch (error) { next(error); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { petsCollection } = getCollections();
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid pet id." });
    const pet = await petsCollection.findOne({ _id: new ObjectId(id) });
    if (!pet) return res.status(404).json({ success: false, message: "Pet not found." });
    res.json({ success: true, pet });
  } catch (error) { next(error); }
});

router.post("/", verifyToken, async (req, res, next) => {
  try {
    const { petsCollection } = getCollections();
    const petPayload = normalizePetPayload(req.body);
    const validationError = validatePetPayload(petPayload);
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    const newPet = { ...petPayload, ownerName: req.user.name, ownerEmail: req.user.email, status: "available", createdAt: new Date(), updatedAt: new Date() };
    const result = await petsCollection.insertOne(newPet);
    res.status(201).json({ success: true, message: "Pet listing added successfully.", pet: { ...newPet, _id: result.insertedId } });
  } catch (error) { next(error); }
});

router.patch("/:id", verifyToken, async (req, res, next) => {
  try {
    const { petsCollection } = getCollections();
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid pet id." });
    const existingPet = await petsCollection.findOne({ _id: new ObjectId(id) });
    if (!existingPet) return res.status(404).json({ success: false, message: "Pet not found." });
    if (existingPet.ownerEmail !== req.user.email) return res.status(403).json({ success: false, message: "Only the pet owner can update this listing." });
    const petPayload = normalizePetPayload(req.body);
    const validationError = validatePetPayload(petPayload);
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    await petsCollection.updateOne({ _id: new ObjectId(id) }, { $set: { ...petPayload, updatedAt: new Date() } });
    const updatedPet = await petsCollection.findOne({ _id: new ObjectId(id) });
    res.json({ success: true, message: "Pet listing updated successfully.", pet: updatedPet });
  } catch (error) { next(error); }
});

router.delete("/:id", verifyToken, async (req, res, next) => {
  try {
    const { petsCollection, requestsCollection } = getCollections();
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid pet id." });
    const existingPet = await petsCollection.findOne({ _id: new ObjectId(id) });
    if (!existingPet) return res.status(404).json({ success: false, message: "Pet not found." });
    if (existingPet.ownerEmail !== req.user.email) return res.status(403).json({ success: false, message: "Only the pet owner can delete this listing." });
    await petsCollection.deleteOne({ _id: new ObjectId(id) });
    await requestsCollection.deleteMany({ petId: id, status: "pending" });
    res.json({ success: true, message: "Pet listing deleted successfully." });
  } catch (error) { next(error); }
});

export default router;
