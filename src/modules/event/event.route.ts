import { Router } from "express";

import {
  authMiddleware,
  optionalAuthMiddleware,
} from "../../middlewares/auth.middleware";
import {
  createEvent,
  deleteEvent,
  getEventById,
  getEvents,
  updateEvent,
} from "./event.controller";

const router = Router();

// Public browsing
router.get("/", getEvents);
router.get("/:id", optionalAuthMiddleware, getEventById);

// Authenticated actions
router.post("/", authMiddleware, createEvent);
router.patch("/:id", authMiddleware, updateEvent);
router.delete("/:id", authMiddleware, deleteEvent);

export default router;

