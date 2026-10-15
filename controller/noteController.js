
import mongoose from "mongoose";
import Note from "../model/Note.js";

const MAX_TITLE_LENGTH = 150;
const MAX_CONTENT_LENGTH = 50000;

function validateNoteInput(body, isUpdate = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Invalid request body.";
  }

  const allowedFields = ["title", "content"];
  const unexpectedFields = Object.keys(body).filter(
    (key) => !allowedFields.includes(key)
  );

  if (unexpectedFields.length > 0) {
    return "Unexpected fields are not allowed.";
  }

  if (!isUpdate && typeof body.title !== "string") {
    return "Note title is required.";
  }

  if (body.title !== undefined) {
    if (typeof body.title !== "string") {
      return "Title must be a string.";
    }

    const title = body.title.trim();

    if (!title) return "Note title is required.";

    if (title.length > MAX_TITLE_LENGTH) {
      return `Title cannot exceed ${MAX_TITLE_LENGTH} characters.`;
    }
  }

  if (body.content !== undefined) {
    if (typeof body.content !== "string") {
      return "Content must be a string.";
    }

    if (body.content.length > MAX_CONTENT_LENGTH) {
      return `Content cannot exceed ${MAX_CONTENT_LENGTH} characters.`;
    }
  }

  if (isUpdate && Object.keys(body).length === 0) {
    return "Provide at least one field to update.";
  }

  return null;
}

// GET /api/notes
export async function getNotes(req, res) {
  try {
    const notes = await Note.find({ user: req.user.id })
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({ notes });
  } catch (error) {
    console.error("Get notes failed:", error.name);

    return res.status(500).json({
      message: "Unable to retrieve notes.",
    });
  }
}

// POST /api/notes
export async function createNote(req, res) {
  const validationError = validateNoteInput(req.body);

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    const note = await Note.create({
      title: req.body.title.trim(),
      content: req.body.content ?? "",
      user: req.user.id,
    });

    return res.status(201).json({
      message: "Note created successfully.",
      note,
    });
  } catch (error) {
    console.error("Create note failed:", error.name);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "The note contains invalid data.",
      });
    }

    return res.status(500).json({
      message: "Unable to create note.",
    });
  }
}

// PUT /api/notes/:id
export async function updateNote(req, res) {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      message: "Invalid note ID.",
    });
  }

  const validationError = validateNoteInput(req.body, true);

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    const updates = {};

    if (req.body.title !== undefined) {
      updates.title = req.body.title.trim();
    }

    if (req.body.content !== undefined) {
      updates.content = req.body.content;
    }

    const note = await Note.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({
        message: "Note not found.",
      });
    }

    return res.status(200).json({
      message: "Note updated successfully.",
      note,
    });
  } catch (error) {
    console.error("Update note failed:", error.name);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "The note contains invalid data.",
      });
    }

    return res.status(500).json({
      message: "Unable to update note.",
    });
  }
}

// DELETE /api/notes/:id
export async function deleteNote(req, res) {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      message: "Invalid note ID.",
    });
  }

  try {
    const note = await Note.findOneAndDelete({
      _id: id,
      user: req.user.id,
    });

    if (!note) {
      return res.status(404).json({
        message: "Note not found.",
      });
    }

    return res.status(200).json({
      message: "Note deleted successfully.",
    });
  } catch (error) {
    console.error("Delete note failed:", error.name);

    return res.status(500).json({
      message: "Unable to delete note.",
    });
  }
}
