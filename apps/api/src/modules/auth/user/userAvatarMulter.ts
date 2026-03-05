import multer from "multer";

export const uploadUserAvatarMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only jpeg, png, gif, webp images are allowed"));
    }
  },
}).single("file");
