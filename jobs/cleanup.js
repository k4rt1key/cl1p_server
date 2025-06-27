const schedule = require("node-schedule");
const Cl1p = require("../models/Cl1p");
const s3 = require("../config/aws");
const bucketName = process.env.AWS_BUCKET_NAME;

schedule.scheduleJob("0 * * * *", async () => { // Runs every hour
  const now = new Date();
  const expiredCl1ps = await Cl1p.find({ expiry: { $lte: now } });

  for (const cl1p of expiredCl1ps) {
    for (const file of cl1p.files) {
      if (!bucketName || !file) {
        continue;
      }
      
      await s3.deleteObject({ Bucket: bucketName, Key: file.fileKey }).promise();
    }
    await Cl1p.deleteOne({ _id: cl1p._id });
  }

  console.log("Expired Cl1ps cleaned up.");
});
