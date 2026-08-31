import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export const generateSignature = (params) => {
  return cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);
};

/**
 * Upload an image buffer to Cloudinary with category folder and naming options
 * @param {Buffer} fileBuffer - The image file buffer
 * @param {string} folder - The Cloudinary folder (e.g. 'club-logos', 'event-posters', 'student-profiles', 'admin-profiles')
 * @param {Object} options - Additional Cloudinary upload options (public_id, unique_filename, overwrite, etc.)
 * @returns {Promise<Object>} Cloudinary upload result
 */
export const uploadImage = (fileBuffer, folder = 'certificates', options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      unique_filename: options.unique_filename !== undefined ? options.unique_filename : (options.public_id ? false : true),
      overwrite: options.overwrite !== undefined ? options.overwrite : (options.public_id ? true : false),
      ...options,
    };

    uploadOptions.folder = folder;

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error("Cloudinary Stream Error:", error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    uploadStream.end(fileBuffer);
  });
};

export const deleteImage = (publicId) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        console.error("Cloudinary Delete Error:", error);
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};

export default cloudinary;
