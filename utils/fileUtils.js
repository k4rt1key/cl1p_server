const s3 = require("../config/aws");
const bucketName = process.env.AWS_BUCKET_NAME;

const getPresignedUploadUrl = async (key, contentType) => {
  if(!key || !contentType || !bucketName){
    throw new Error("Key, Bucket name and contentType are required");
  }

  if (typeof key !== "string" || !key.trim()) {
    throw new Error("Invalid file name. Key must be a non-empty string.");
  }

  if (typeof contentType !== "string" || !contentType.trim()) {
    throw new Error("Invalid content type. ContentType must be a non-empty string.");
  }

  const params = {
    Bucket: bucketName,
    Key: key.toString(),
    Expires: 3600,  
    ContentType: contentType,  
  };

  try {
    const uploadUrl = await s3.getSignedUrlPromise("putObject", params);
    return uploadUrl;
  } catch (error) {
    console.error("Error generating pre-signed URL", error.message);
    throw new Error("Could not generate pre-signed URL");
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
    
    console.log(key.toString());
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
