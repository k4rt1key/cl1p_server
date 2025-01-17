const AWS = require("aws-sdk");
const dotenv = require("dotenv");
dotenv.config();

if(!process.env.AWS_ACCESS_KEY_ID){
  throw new Error("AWS_ACCESS_KEY_ID is not defined");
}

if(!process.env.AWS_SECRET_ACCESS_KEY){
  throw new Error("AWS_SECRET_ACCESS_KEY is not defined");
}

if(!process.env.AWS_REGION){
  throw new Error("AWS_REGION is not defined");
}


const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

module.exports = s3;
