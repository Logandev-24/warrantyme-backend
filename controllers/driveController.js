const { google } = require("googleapis");
const User = require("../models/User");
const logger = require("../utils/logger");
const { response } = require("express");

// ✅ Function to find or create the "YOURDOCUMENT" folder
const getOrCreateFolder = async (drive) => {
  try {
    const folderName = "YOURDOCUMENT";

    // ✅ Step 1: Check if the folder already exists
    const response = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id)",
    });

    if (response.data.files.length > 0) {
      logger.info(
        `📂 Found Existing Folder: ${folderName} (ID: ${response.data.files[0].id})`
      );
      return response.data.files[0].id; // ✅ Return existing folder ID
    }

    // ✅ Step 2: Create folder if it doesn't exist
    const folder = await drive.files.create({
      resource: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id",
    });

    logger.info(`📁 Created New Folder: ${folderName} (ID: ${folder.data.id})`);
    return folder.data.id;
  } catch (error) {
    logger.error(`❌ Error finding/creating folder: ${error.message}`);
    throw new Error("Failed to find or create folder");
  }
};

// ✅ Create a new Google Docs file with user-defined name & content
const createGoogleDoc = async (req, res) => {
  try {
    const { fileName, content } = req.body;

    if (!fileName || !content) {
      return res
        .status(400)
        .json({ error: "fileName and content are required" });
    }

    // ✅ Get the authenticated user
    const user = await User.findById(req.user.userId);
    if (!user || !user.accessToken) {
      return res
        .status(401)
        .json({ error: "Unauthorized: No valid access token" });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: user.accessToken });

    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const docs = google.docs({ version: "v1", auth: oauth2Client });

    // ✅ Step 1: Get or create "YOURDOCUMENT" folder
    const folderId = await getOrCreateFolder(drive);

    // ✅ Step 2: Create Google Docs file inside the folder
    const fileMetadata = {
      name: fileName,
      mimeType: "application/vnd.google-apps.document",
      parents: [folderId], // Store in the "YOURDOCUMENT" folder
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      fields: "id, name, webViewLink",
    });

    const fileId = file.data.id;
    const fileUrl = file.data.webViewLink;

    logger.info(`📄 Google Doc Created: ${fileName} (ID: ${fileId})`);

    // ✅ Step 3: Insert content into the document
    await docs.documents.batchUpdate({
      documentId: fileId,
      requestBody: {
        requests: [{ insertText: { location: { index: 1 }, text: content } }],
      },
    });

    // ✅ Step 4: Store file details in the database
    user.files = user.files || [];
    user.files.push({ fileId, fileName, fileUrl });
    await user.save();

    res.status(201).json({ success: true, fileId, fileName, fileUrl });
  } catch (error) {
    logger.error(`❌ Error creating Google Docs file: ${error.message}`);
    res.status(500).json({ error: "Failed to create file" });
  }
};

const listFilesInFolder = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.accessToken) {
      return res
        .status(401)
        .json({ error: "Unauthorized: No valid access tokens" });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: user.accessToken });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // ✅ Find the "YOURDOCUMENT" folder
    const folderName = "YOURDOCUMENT";
    const folderResponse = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id, name)", // Request the ID and name of the folder
    });

    if (!folderResponse.data.files.length) {
      return res.json({ success: true, files: [], message: "No folder found" });
    }

    const folderId = folderResponse.data.files[0].id;

    // ✅ Fetch files in the folder with modifiedTime field
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false`,
      fields: "files(id, name, webViewLink, modifiedTime)", // Add modifiedTime field
    });

    logger.info(`📂 Found ${response.data.files.length} files in YOURDOCUMENT`);

    // Map over the files and format the modifiedTime to a proper date string
    const filesWithFormattedTime = response.data.files.map((file) => {
      return {
        ...file,
        modifiedTime: file.modifiedTime
          ? new Date(file.modifiedTime).toLocaleString()
          : "No Date Available",
      };
    });

    res.json({
      success: true,
      files: filesWithFormattedTime, // Send files with modifiedTime formatted
    });
  } catch (error) {
    logger.error(`❌ Error listing files: ${error.message}`);
    res.status(500).json({ error: "Failed to list files" });
  }
};

const updateGoogleDoc = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { content } = req.body;

    if (!fileId || !content) {
      return res
        .status(400)
        .json({ error: "File ID and content are required" });
    }

    const user = await User.findById(req.user.userId);
    if (!user || !user.accessToken) {
      return res
        .status(401)
        .json({ error: "Unauthorized: No valid access token" });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: user.accessToken });

    const docs = google.docs({ version: "v1", auth: oauth2Client });

    // ✅ Replace document content
    await docs.documents.batchUpdate({
      documentId: fileId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: content,
            },
          },
        ],
      },
    });

    logger.info(`✏️ Updated Google Doc (ID: ${fileId})`);

    res.json({ success: true, message: "Document updated successfully" });
  } catch (error) {
    logger.error(`❌ Error updating document: ${error.message}`);
    res.status(500).json({ error: "Failed to update document" });
  }
};

const shareGoogleDoc = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { email, role } = req.body; // role: "reader" (view) or "writer" (edit)

    if (!fileId || !email || !role) {
      return res
        .status(400)
        .json({ error: "File ID, email, and role are required" });
    }

    const user = await User.findById(req.user.userId);
    if (!user || !user.accessToken) {
      return res
        .status(401)
        .json({ error: "Unauthorized: No valid access token" });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: user.accessToken });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // ✅ Grant permission to the email
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: role, // "reader" (view) or "writer" (edit)
        type: "user",
        emailAddress: email,
      },
      fields: "id",
    });

    logger.info(
      `👥 Shared Google Doc (ID: ${fileId}) with ${email} as ${role}`
    );

    res.json({
      success: true,
      message: `Document shared with ${email} as ${role}`,
    });
  } catch (error) {
    logger.error(`❌ Error sharing document: ${error.message}`);
    res.status(500).json({ error: "Failed to share document" });
  }
};
const deleteGoogleDoc = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({ error: "File ID is required" });
    }

    // ✅ Get user from DB
    const user = await User.findById(req.user.userId);
    if (!user || !user.accessToken) {
      return res
        .status(401)
        .json({ error: "Unauthorized: No valid access token" });
    }

    // ✅ Authenticate Google API
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: user.accessToken });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // ✅ Delete file from Google Drive
    await drive.files.delete({ fileId });

    // ✅ Remove file reference from user's DB record
    user.files = user.files.filter((file) => file.fileId !== fileId);
    await user.save();

    logger.info(`🗑️ File Deleted: ${fileId}`);

    res.json({
      success: true,
      message: "File deleted successfully",
      fileId: fileId,
    });
  } catch (error) {
    logger.error(`❌ Error deleting file: ${error.message}`);
    res.status(500).json({ error: "Failed to delete file" });
  }
};
const generateShareableLink = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { permissionType } = req.body; // "reader" (view) or "writer" (edit)

    if (!fileId || !permissionType) {
      return res
        .status(400)
        .json({ error: "File ID and permissionType are required" });
    }

    const user = await User.findById(req.user.userId);
    if (!user || !user.accessToken) {
      return res
        .status(401)
        .json({ error: "Unauthorized: No valid access token" });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: user.accessToken });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // ✅ Set file permissions to allow "anyone" with the link to access
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: permissionType, // "reader" (view) or "writer" (edit)
        type: "anyone",
      },
      fields: "id",
    });

    // ✅ Get the webViewLink
    const file = await drive.files.get({
      fileId,
      fields: "webViewLink",
    });

    logger.info(`🔗 Generated shareable link for file (ID: ${fileId})`);

    res.json({
      success: true,
      fileId,
      shareableLink: file.data.webViewLink,
      permissionType,
    });
  } catch (error) {
    logger.error(`❌ Error generating shareable link: ${error.message}`);
    res.status(500).json({ error: "Failed to generate shareable link" });
  }
};

const fetchGoogleDocContent = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({ error: "File ID is required" });
    }

    // Get user from DB
    const user = await User.findById(req.user.userId);
    if (!user || !user.accessToken) {
      return res
        .status(401)
        .json({ error: "Unauthorized: No valid access token" });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: user.accessToken });

    const docs = google.docs({ version: "v1", auth: oauth2Client });

    // Fetch the document content
    const response = await docs.documents.get({
      documentId: fileId,
    });

    const content = response.data.body.content;
    const title = response.data.title;
    // Format the content if needed (extract text, etc.)
    const formattedContent = content
      .map((element) => {
        if (element.paragraph) {
          return element.paragraph.elements
            .map((el) => (el.textRun ? el.textRun.content : ""))
            .join("");
        }
        return ""; // Return empty string if no paragraph
      })
      .join("\n"); // Combine paragraphs with newlines
    
    res.json({
      success: true,
      title: title,
      content: formattedContent,
    });
  } catch (error) {
    logger.error(`❌ Error fetching document content: ${error.message}`);
    res.status(500).json({ error: "Failed to fetch document content" });
  }
};

const updateGoogleDocContent = async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const { content } = req.body; 
    console.log(content)
    if (!fileId || !content) {
      return res
        .status(400)
        .json({ error: "File ID and new content are required" });
    }

    // Get user from DB
    const user = await User.findById(req.user.userId);
    if (!user || !user.accessToken) {
      return res
        .status(401)
        .json({ error: "Unauthorized: No valid access token" });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: user.accessToken });

    const docs = google.docs({ version: "v1", auth: oauth2Client });

    // Insert new content at the beginning (index 1 for the first position)
    const requests = [
      {
        insertText: {
          location: {
            index: 1, // Insert at the beginning of the document
          },
          text: content, // New content to be inserted
        },
      },
    ];

    // Execute the batch update to update the content
    await docs.documents.batchUpdate({
      documentId: fileId,
      requestBody: { requests },
    });

    logger.info(`✏️ Updated Google Doc (ID: ${fileId}) with new content`);

    res.json({
      success: true,
      message: "Document updated successfully",
    });
  } catch (error) {
    logger.error(`❌ Error updating document: ${error.message}`);
    res.status(500).json({ error: "Failed to update document" });
  }
};

module.exports = {
  createGoogleDoc,
  getOrCreateFolder,
  fetchGoogleDocContent,
  updateGoogleDocContent,
  updateGoogleDoc,
  shareGoogleDoc,
  deleteGoogleDoc,
  generateShareableLink,
  listFilesInFolder,
};
