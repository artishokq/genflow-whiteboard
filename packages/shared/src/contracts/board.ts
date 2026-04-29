export type BoardAccessRole = "owner" | "editor" | "viewer";

export type BoardCollaboratorRole = "editor" | "viewer";

export type BoardTemplateId = "blank" | "flowchart" | "mindmap" | "retrospective";

export type BoardSummary = {
  id: string;
  title: string;
  isStarred: boolean;
  myRole: BoardAccessRole;
  createdAt: string;
  updatedAt: string;
};

export type BoardShareLinkRole = "viewer" | "editor";

export type BoardShareLinkRow = {
  id: string;
  role: BoardShareLinkRole;
  createdAt: string;
  revokedAt: string | null;
};

export type BoardMemberRow = {
  userId: string;
  role: BoardShareLinkRole;
  createdAt: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarObjectKey: string | null;
};

export type BoardSectionSummary = {
  id: string;
  name: string;
  position: number;
  boardsCount: number;
  containsBoard: boolean;
};
