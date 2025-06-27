const Cl1p = require("../models/Cl1p");
const { hashPassword, verifyPassword } = require("../utils/auth");
const { getPresignedUploadUrl, getPresignedDownloadUrl } = require("../utils/fileUtils");

// Validation constants
const MAX_TEXT_LENGTH = 1000000; // 1MB
const MAX_TOTAL_FILE_SIZE = 25 * 1024 * 1024; // 25MB total
const MAX_FILENAME_LENGTH = 255;
const MAX_INDIVIDUAL_FILE_SIZE = MAX_TOTAL_FILE_SIZE;


/**
 * Validates file metadata with total size limit
 * @param {Array} files - Array of file objects with size property
 * @throws {Error} If validation fails
 */
const validateFiles = (files) => {
  try {
    if (!Array.isArray(files)) {
      throw new Error("Files must be an array");
    }
    
    let totalSize = 0;
    
    files?.forEach((file, index) => {
      if (!file.fileName || !file.contentType) {
        throw new Error("Each file must have fileName and contentType");
      }
      if (file.fileName.length > MAX_FILENAME_LENGTH) {
        throw new Error(`Filename cannot exceed ${MAX_FILENAME_LENGTH} characters`);
      }
      
      // Check if size is provided and is a valid number
      if (typeof file.size !== 'number' || file.size <= 0) {
        throw new Error(`File '${file.fileName}' must have a valid size`);
      }
      
      // Check individual file size limit
      if (file.size > MAX_INDIVIDUAL_FILE_SIZE) {
        throw new Error(`File '${file.fileName}' exceeds maximum allowed size of ${MAX_INDIVIDUAL_FILE_SIZE} bytes`);
      }
      
      totalSize += file.size;
    });
    
    // Check total size limit
    if (totalSize > MAX_TOTAL_FILE_SIZE) {
      throw new Error(`Total file size (${totalSize} bytes) exceeds maximum allowed size of ${MAX_TOTAL_FILE_SIZE} bytes`);
    }
  } catch (err) {
    throw new Error(`Validation error: ${err.message}`);
  }
};

exports.searchCl1p = async (req, res) => {
  const { name, password } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({
      status: "error",
      message: "Valid clip name is required"
    });
  }

  try {
    const cl1p = await Cl1p.findOne({ name }).select("+password");
    if (!cl1p) {
      return res.status(404).json({
        status: "error",
        message: "Cl1p not found"
      });
    }

    // Check if clip has expired
    if (cl1p.expiry && new Date() > cl1p.expiry) {
      await Cl1p.deleteOne({ _id: cl1p._id }); // Clean up expired clip
      return res.status(404).json({
        status: "error",
        message: "Cl1p has expired"
      });
    }

    if (cl1p.password) {
      if (!password) {
        return res.status(401).json({
          status: "error",
          message: "Password required",
          isPassword: true
        });
      }

      const isMatch = await verifyPassword(password, cl1p.password);
      if (!isMatch) {
        return res.status(401).json({
          status: "error",
          message: "Invalid password",
          isPassword: true
        });
      }
    }

    const filePreviews = await Promise.all(
      (cl1p.files || []).map(async (file) => {
        try {
          if (!file.fileKey) return null;
          const url = await getPresignedDownloadUrl(file.fileKey.toString());
          return {
            url,
            fileName: file.fileName,
            size: file.size,
            mimeType: file.contentType
          };
        } catch (error) {
          throw new Error(`Error generating presigned URL for ${file.fileName}: ${error}`)
        }
      })
    ).then(files => files.filter(file => file !== null)); // Filter out failed files

    res.status(200).json({
      status: "success",
      message: "Cl1p found",
      data: {
        text: cl1p.text,
        files: filePreviews,
        expiry: cl1p.expiry
      }
    });
  } catch (err) {
    console.error("Error searching cl1p:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.createCl1p = async (req, res) => {
  const { name, text, files = [], password, expiry } = req.body;
  try {
    // Input validation
    if (!name || typeof name !== 'string' || name.length < 1) {
      return res.status(400).json({
        status: "error",
        message: "Valid name is required"
      });
    }

    if (text && typeof text !== 'string') {
      return res.status(400).json({
        status: "error",
        message: "Text must be a string"
      });
    }

    if (text && text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({
        status: "error",
        message: `Text cannot exceed ${MAX_TEXT_LENGTH} characters`
      });
    }

    try {
      validateFiles(files?.length > 0 ? files : []);
    } catch (err) {
      if (err.message.includes('maximum allowed size') || err.message.includes('must have a valid size')) {
        return res.status(400).json({
          status: "error",
          message: err.message
        });
      }
      throw err;
    }

    // Check for existing cl1p
    const existingCl1p = await Cl1p.findOne({ name });
    if (existingCl1p) {
      return res.status(400).json({
        status: "error",
        message: "Cl1p name already exists"
      });
    }

    const hashedPassword = password ? await hashPassword(password) : null;
    // const expiryDate = new Date(Date.now() + expiry * 60 * 60 * 1000);
    const expiryDate = expiry;

    const newCl1p = new Cl1p({
      name,
      text: text || "",
      files: files?.length > 0 ? files.map(file => ({
        fileName: file.fileName.toString(),
        fileKey: `${name}/${file.fileName}`,
        contentType: file.contentType,
        size: file.size
      })) : [],
      password: hashedPassword,
      expiry: expiryDate
    });

    await newCl1p.save();

    res.status(201).json({
      status: "success",
      message: "Cl1p created successfully"
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        status: "error",
        message: "Validation error",
        details: Object.values(err.errors).map(e => e.message)
      });
    }

    console.error("Error creating cl1p:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.getPresignedUrls = async (req, res) => {
  const { cl1pName, files } = req.body;

  if (!cl1pName || typeof cl1pName !== 'string' || cl1pName.length < 1) {
    return res.status(400).json({
      status: "error",
      message: "Valid cl1pName is required"
    });
  }

  try {
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({
        status: "error",
        message: "Files array is required"
      });
    }

    try {
      validateFiles(files);
    } catch (err) {
      if (err.message.includes('maximum allowed size') || err.message.includes('must have a valid size')) {
        return res.status(400).json({
          status: "error",
          message: err.message
        });
      }
      throw err;
    }

    const presignedPosts = await Promise.all(
      files.map(async (file) => {
        try {
          const s3Key = `${cl1pName}/${file.fileName}`;
          const maxSizeForFile = file.size + (1 * 1024 * 1024); // original size + 1MB
          return await getPresignedUploadUrl(s3Key, file.contentType, maxSizeForFile);
        } catch (error) {
          throw new Error(`Error generating pre-signed POST for ${file.fileName}: ${error}`);
        }
      })
    );

    if (presignedPosts.length !== files.length) {
      return res.status(500).json({
        status: "error",
        message: "Some pre-signed POSTs could not be generated"
      });
    }

    res.status(200).json({
      status: "success",
      message: "Pre-signed POST URLs generated successfully",
      data: { posts: presignedPosts }
    });
  } catch (err) {
    if (err.message.includes('validation') || err.message.includes('maximum allowed size') || err.message.includes('must have a valid size')) {
      return res.status(400).json({
        status: "error",
        message: err.message
      });
    }

    res.status(500).json({
      status: "error",
      message: "Server error",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};