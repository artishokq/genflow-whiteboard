import multer from "multer";

export const uploadBoardImageMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype)) {
      cb(null, true);
    } else if (/^video\/(mp4|webm|quicktime)$/i.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only jpeg, png, gif, webp images and mp4, webm, mov videos are allowed"));
    }
  },
}).single("file");
