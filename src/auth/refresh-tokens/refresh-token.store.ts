// src/auth/refresh-tokens/refresh-token.store.ts
export type StoredRefreshToken = {
  userId: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export interface RefreshTokenStore {
  save(tokenHash: string, token: StoredRefreshToken): Promise<void>;
  find(tokenHash: string): Promise<StoredRefreshToken | undefined>;
  revoke(tokenHash: string): Promise<void>;
  revokeFamily(familyId: string): Promise<void>;
}

export const REFRESH_TOKEN_STORE = Symbol('REFRESH_TOKEN_STORE');
