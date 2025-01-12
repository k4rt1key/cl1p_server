const s3 = require("../config/aws");
const bucketName = process.env.AWS_BUCKET_NAME;

const getPresignedUploadUrl = async (key, contentType) => {
  const params = {
    Bucket: bucketName,
    Key: key,
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
    const params = {
      Bucket: bucketName,
      Key: key,
      Expires: 3600,
    };
    return s3.getSignedUrlPromise("getObject", params);
  } catch(error){
    console.error("Error generating pre-signed URL", error.message);
    throw new Error("Could not generate pre-signed URL");
  }
};

module.exports = { getPresignedUploadUrl, getPresignedDownloadUrl };
