export type CreateInviteResult = { token: string; expiresAt: Date };
export type PreviewInviteResult = {
  teamName: string;
  playerName: string;
  expiresAt: Date;
};
