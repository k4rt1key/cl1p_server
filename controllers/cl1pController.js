const Cl1p = require("../models/Cl1p");
const { hashPassword, verifyPassword } = require("../utils/auth");
const { getPresignedUploadUrl, getPresignedDownloadUrl } = require("../utils/fileUtils");

// Validation constants
const MAX_TEXT_LENGTH = 1000000; // 1MB
const MAX_FILES = 10;
const MAX_FILENAME_LENGTH = 255;
const MIN_EXPIRY_HOURS = 1;
const MAX_EXPIRY_HOURS = 720; // 30 days


/**
 * Validates file metadata
 * @param {Array} files - Array of file objects
 * @throws {Error} If validation fails
 */
const validateFiles = (files) => {
  if (!Array.isArray(files)) {
    throw new Error("Files must be an array");
  }
  
  if (files.length > MAX_FILES) {
    throw new Error(`Maximum ${MAX_FILES} files allowed`);
  }

  files.forEach(file => {
    if (!file.fileName || !file.contentType) {
      throw new Error("Each file must have fileName and contentType");
    }
    
    if (file.fileName.length > MAX_FILENAME_LENGTH) {
      throw new Error(`Filename cannot exceed ${MAX_FILENAME_LENGTH} characters`);
    }
    
  });
};

/**
 * Validates expiry time
 * @param {number} expiry - Expiry time in hours
 * @throws {Error} If validation fails
 */
const validateExpiry = (expiry) => {
  if (!Number.isInteger(expiry) || expiry < MIN_EXPIRY_HOURS || expiry > MAX_EXPIRY_HOURS) {
    throw new Error(`Expiry must be between ${MIN_EXPIRY_HOURS} and ${MAX_EXPIRY_HOURS} hours`);
  }
};

exports.searchCl1p = async (req, res) => {
  const { name, password } = req.body;
  console.log(`Name : ${name}`)
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
          if(file.fileName === undefined || file.fileName === null || file.fileName === "") {
            return null;
          }
          return await getPresignedDownloadUrl(file.fileName.toString());
        } catch (error) {
          throw new Error(`Error generating presigned URL for ${file.fileName}: ${error}`)
        }
      })
    ).then(urls => urls.filter(url => url !== null)); // Filter out failed URLs

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

    validateFiles(files);
    // validateExpiry(expiry);

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
      files: files.map(file => ({ fileName: file.fileName.toString(), contentType: file.contentType })),
      password: hashedPassword,
      expiry: expiryDate
    });

    console.log(files[0].fileName.toString());

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
  const { files } = req.body;

  try {
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({
        status: "error",
        message: "Files array is required"
      });
    }

    validateFiles(files);

    const urls = await Promise.all(
      files.map(async (file) => {
        try {
          return await getPresignedUploadUrl(file.fileName.toString(), file.contentType);
        } catch (error) {
          throw new Error (`Error generating presigned URL for ${file.fileName}: ${error}`);
        }
      })
    ).then(urls => urls.filter(url => url !== null));

    if (urls.length !== files.length) {
      return res.status(500).json({
        status: "error",
        message: "Some presigned URLs could not be generated"
      });
    }

    res.status(200).json({
      status: "success",
      message: "Pre-signed URLs generated successfully",
      data: { urls }
    });
  } catch (err) {
    if (err.message.includes('validation')) {
      return res.status(400).json({
        status: "error",
        message: err.message
      });
    }
    
    console.error("Error generating pre-signed URLs:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};