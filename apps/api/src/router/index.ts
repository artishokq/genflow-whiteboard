import express, { Router } from "express";

import { requireAdmin, requireAuth } from "../middlewares/authMiddleware";
import {
  authSessionLimiter,
  boardApiLimiter,
  boardSnapshotLimiter,
  registerFlowLimiter,
} from "../middlewares/rateLimit";
import { registerValidators } from "../middlewares/registerValidation";
import userController from "../modules/auth/user/user.controller";
import { uploadUserAvatarMiddleware } from "../modules/auth/user/userAvatarMulter";
import boardController from "../modules/boards/board.controller";
import { uploadBoardImageMiddleware } from "../modules/boards/boardImageMulter";
import { requireBoardImageUploadAuth } from "../modules/boards/requireBoardImageUploadAuth";

const snapshotBodyParser = express.raw({
  type: "application/octet-stream",
  limit: "16mb",
});

const router = Router();

router.post(
  "/register",
  registerFlowLimiter,
  ...registerValidators,
  userController.register,
);
router.post(
  "/register/confirm",
  registerFlowLimiter,
  userController.confirmRegistration,
);
router.post(
  "/register/resend",
  registerFlowLimiter,
  userController.resendRegistrationCode,
);
router.post("/login", authSessionLimiter, userController.login);
router.post("/logout", authSessionLimiter, userController.logout);
router.get("/refresh", authSessionLimiter, userController.refresh);
router.get("/me", authSessionLimiter, requireAuth, userController.me);
router.get("/users/:userId/avatar", authSessionLimiter, userController.serveUserAvatar);
router.post(
  "/profile/avatar",
  authSessionLimiter,
  requireAuth,
  uploadUserAvatarMiddleware,
  userController.uploadAvatar,
);
router.delete("/profile/avatar", authSessionLimiter, requireAuth, userController.removeAvatar);
router.patch(
  "/profile/first-name",
  authSessionLimiter,
  requireAuth,
  userController.updateFirstName,
);
router.patch(
  "/profile/last-name",
  authSessionLimiter,
  requireAuth,
  userController.updateLastName,
);
router.post(
  "/profile/email/request",
  authSessionLimiter,
  requireAuth,
  userController.requestEmailChange,
);
router.post(
  "/profile/email/confirm",
  authSessionLimiter,
  requireAuth,
  userController.confirmEmailChange,
);
router.post(
  "/profile/password",
  authSessionLimiter,
  requireAuth,
  userController.changePassword,
);
router.post("/recover/request", authSessionLimiter, userController.requestPasswordReset);
router.post("/recover/resend", authSessionLimiter, userController.resendPasswordReset);
router.post("/recover/confirm", authSessionLimiter, userController.confirmPasswordReset);

router.post(
  "/boards",
  boardApiLimiter,
  requireAuth,
  boardController.create,
);
router.get(
  "/board-sections",
  boardApiLimiter,
  requireAuth,
  boardController.listSections,
);
router.post(
  "/board-sections",
  boardApiLimiter,
  requireAuth,
  boardController.createSection,
);
router.delete(
  "/board-sections/:sectionId",
  boardApiLimiter,
  requireAuth,
  boardController.deleteSection,
);
router.patch(
  "/board-sections/:sectionId",
  boardApiLimiter,
  requireAuth,
  boardController.renameSection,
);
router.post(
  "/board-sections/reorder",
  boardApiLimiter,
  requireAuth,
  boardController.reorderSections,
);
router.get(
  "/board-sections/:sectionId/boards",
  boardApiLimiter,
  requireAuth,
  boardController.listSectionBoards,
);
router.post(
  "/board-sections/:sectionId/boards",
  boardApiLimiter,
  requireAuth,
  boardController.addBoardToSection,
);
router.delete(
  "/board-sections/:sectionId/boards/:boardId",
  boardApiLimiter,
  requireAuth,
  boardController.removeBoardFromSection,
);
router.post(
  "/board-sections/:sectionId/boards/reorder",
  boardApiLimiter,
  requireAuth,
  boardController.reorderBoardsInSection,
);
router.get("/boards", boardApiLimiter, requireAuth, boardController.list);
router.get(
  "/boards/:id",
  boardApiLimiter,
  requireAuth,
  boardController.getById,
);
router.post(
  "/boards/:id/claim",
  boardApiLimiter,
  requireAuth,
  boardController.claimByShare,
);
router.patch(
  "/boards/:id",
  boardApiLimiter,
  requireAuth,
  boardController.patch,
);
router.patch(
  "/boards/:id/starred",
  boardApiLimiter,
  requireAuth,
  boardController.setStarred,
);
router.delete(
  "/boards/:id",
  boardApiLimiter,
  requireAuth,
  boardController.remove,
);
router.post(
  "/boards/:id/ai/generations",
  boardApiLimiter,
  requireAuth,
  requireAdmin,
  boardController.createAiGeneration,
);
router.get(
  "/boards/:id/ai/generations/:requestId",
  boardApiLimiter,
  requireAuth,
  requireAdmin,
  boardController.getAiGeneration,
);
router.post(
  "/boards/:id/images",
  boardApiLimiter,
  requireAuth,
  requireBoardImageUploadAuth,
  uploadBoardImageMiddleware,
  boardController.uploadImage,
);
router.get(
  "/boards/:id/images/:filename",
  boardApiLimiter,
  boardController.serveImage,
);
router.get(
  "/boards/:id/snapshot",
  boardSnapshotLimiter,
  requireAuth,
  boardController.getSnapshot,
);
router.put(
  "/boards/:id/snapshot",
  boardSnapshotLimiter,
  requireAuth,
  snapshotBodyParser,
  boardController.putSnapshot,
);
router.post(
  "/boards/:id/share-links",
  boardApiLimiter,
  requireAuth,
  boardController.createShareLink,
);
router.get(
  "/boards/:id/share-links",
  boardApiLimiter,
  requireAuth,
  boardController.listShareLinks,
);
router.delete(
  "/boards/:id/share-links/:linkId",
  boardApiLimiter,
  requireAuth,
  boardController.revokeShareLink,
);
router.get(
  "/boards/:id/members",
  boardApiLimiter,
  requireAuth,
  boardController.listMembers,
);
router.post(
  "/boards/:id/members",
  boardApiLimiter,
  requireAuth,
  boardController.addMember,
);
router.delete(
  "/boards/:id/members/:userId",
  boardApiLimiter,
  requireAuth,
  boardController.removeMember,
);
router.get(
  "/boards/:id/comments",
  boardApiLimiter,
  requireAuth,
  boardController.listComments,
);
router.post(
  "/boards/:id/comments/threads",
  boardApiLimiter,
  requireAuth,
  boardController.createCommentThread,
);
router.post(
  "/boards/:id/comments/threads/:threadId/messages",
  boardApiLimiter,
  requireAuth,
  boardController.addCommentMessage,
);
router.patch(
  "/boards/:id/comments/threads/:threadId",
  boardApiLimiter,
  requireAuth,
  boardController.updateCommentThread,
);
router.delete(
  "/boards/:id/comments/threads/:threadId",
  boardApiLimiter,
  requireAuth,
  boardController.deleteCommentThread,
);

export default router;
