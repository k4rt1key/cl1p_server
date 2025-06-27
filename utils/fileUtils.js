const s3 = require("../config/aws");
const bucketName = process.env.AWS_BUCKET_NAME;

const getPresignedUploadUrl = async (key, contentType, maxSize) => {
  if(!key || !contentType || !bucketName){
    throw new Error("Key, Bucket name and contentType are required");
  }

  if (typeof key !== "string" || !key.trim()) {
    throw new Error("Invalid file name. Key must be a non-empty string.");
  }

  if (typeof contentType !== "string" || !contentType.trim()) {
    throw new Error("Invalid content type. ContentType must be a non-empty string.");
  }

  if (typeof maxSize !== "number" || maxSize <= 0) {
    throw new Error("Max size must be a positive number");
  }

  const params = {
    Bucket: bucketName,
    Fields: {
      key: key.toString(),
      'Content-Type': contentType
    },
    Conditions: [
      ["content-length-range", 1, maxSize],
      { "Content-Type": contentType },
      { key: key.toString() }
    ],
    Expires: 3600
  };

  try {
    return await new Promise((resolve, reject) => {
      s3.createPresignedPost(params, (err, data) => {
        if (err) {
          console.error("Error generating pre-signed POST", err.message);
          reject(new Error("Could not generate pre-signed POST"));
        } else {
          resolve(data);
        }
      });
    });
  } catch (error) {
    console.error("Error generating pre-signed POST", error.message);
    throw new Error("Could not generate pre-signed POST");
  }
};

const getPresignedDownloadUrl = async (key) => {
  try{

    if(!key || !bucketName){
      throw new Error("Key is required");
    }

    if (typeof key !== "string" || !key.trim()) {
      throw new Error("Invalid file name. Key must be a non-empty string.");
    }
    
    const params = {
      Bucket: bucketName,
      Key: key.toString(),
      Expires: 3600,
    };

    return s3.getSignedUrlPromise("getObject", params);
  } catch(error){
    console.error("Error generating pre-signed URL", error.message);
    throw new Error("Could not generate pre-signed URL");
  }
};

module.exports = { getPresignedUploadUrl, getPresignedDownloadUrl };
