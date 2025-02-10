import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_API_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadToCloudinary(localPathImages) {
  try {
    if (!Array.isArray(localPathImages) || localPathImages.length === 0) {
      return console.log("Could not find local path images");
    }

    const uploadPromises = localPathImages.map(async (imagePath) => {
      const result = await cloudinary.uploader.upload(imagePath, {
        resource_type: "image",
      });
      fs.unlinkSync(imagePath); // Remove the local file after successful upload
      return result;
    });

    // Wait for all uploads to complete
    const uploadedResults = await Promise.all(uploadPromises);
    return uploadedResults;
  } catch (error) {
    console.log("error upload to cloudinary");
    localPathImages.forEach((localPathImage) => {
      if (fs.existsSync(localPathImage)) {
        fs.unlinkSync(localPathImage);
        console.log(`Deleted local file due to error: ${localPathImage}`);
      }
    });
  }
}

async function uploadSingleImageToCloudinary(localPathImage) {
  try {
    if (!localPathImage) {
      throw new Error("No file provided for upload");
    }

    const result = await cloudinary.uploader.upload(localPathImage, {
      resource_type: "image",
    });

    fs.unlinkSync(localPathImage); // Remove local file after upload
    return result;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error.message);

    if (fs.existsSync(localPathImage)) {
      fs.unlinkSync(localPathImage);
      console.log(`Deleted local file due to error: ${localPathImage}`);
    }
    throw error;
  }
}

export { uploadToCloudinary, uploadSingleImageToCloudinary };
