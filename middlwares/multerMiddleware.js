import multer from "multer";

// Define the storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/"); // Path to store the file
  },

  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix); // Unique filename
  },
});

// Initialize multer with multiple fields configuration
const upload = multer({
  storage: storage,
});

// Middleware to handle multiple variant images
const uploadFileUsingMulter = upload.fields([
  { name: "variants[0][images]", maxCount: 5 },
  { name: "variants[1][images]", maxCount: 5 },
  { name: "variants[2][images]", maxCount: 5 },
  { name: "variants[3][images]", maxCount: 5 },
  { name: "variants[4][images]", maxCount: 5 },
  { name: "variants[5][images]", maxCount: 5 },
  { name: "variants[6][images]", maxCount: 5 },
  { name: "variants[7][images]", maxCount: 5 },
  { name: "variants[8][images]", maxCount: 5 },
  { name: "variants[9][images]", maxCount: 5 },
  { name: "variants[10][images]", maxCount: 5 },

  // Add more fields if needed
]);

// In your route, use .fields() to accept multiple fields
export { uploadFileUsingMulter, upload };
