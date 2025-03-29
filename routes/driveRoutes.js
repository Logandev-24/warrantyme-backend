const express = require("express");
const { authMiddleware } = require("../middlewares/authMiddleware");
const {
  createGoogleDoc,
  updateGoogleDocContent,
  fetchGoogleDocContent,
  listFilesInFolder,
  updateGoogleDoc,
  shareGoogleDoc,
  deleteGoogleDoc,
  generateShareableLink,
} = require("../controllers/driveController");

const router = express.Router();

router.post("/create-file", authMiddleware, createGoogleDoc);
router.get("/list-files", authMiddleware, listFilesInFolder);
router.patch("/update-file/:fileId", authMiddleware, updateGoogleDoc);
router.post("/share-file/:fileId", authMiddleware, shareGoogleDoc);
router.delete("/delete-file/:fileId", authMiddleware, deleteGoogleDoc);
router.post(
  "/generate-shareable-link/:fileId",
  authMiddleware,
  generateShareableLink
);
router.get(
  "/fetch-file-content/:fileId",
  authMiddleware,
  fetchGoogleDocContent
);
router.patch(
  "/update-file-content/:fileId",
  authMiddleware,
  updateGoogleDocContent
);

module.exports = router;
