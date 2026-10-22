import { Injectable } from '@nestjs/common';
import { RefreshTokenStore, StoredRefreshToken } from './refresh-token.store';

@Injectable()
export class InMemoryRefreshTokenStore implements RefreshTokenStore {
  private readonly tokens = new Map<string, StoredRefreshToken>();

  async save(tokenHash: string, token: StoredRefreshToken): Promise<void> {
    this.tokens.set(tokenHash, token);
  }
  async find(tokenHash: string): Promise<StoredRefreshToken | undefined> {
    const entry = this.tokens.get(tokenHash);
    if (entry && entry.expiresAt <= new Date()) {
      this.tokens.delete(tokenHash);
      return undefined;
    }
    return entry;
  }
  async revoke(tokenHash: string): Promise<void> {
    const entry = this.tokens.get(tokenHash);
    if (entry) {
      this.tokens.set(tokenHash, { ...entry, revokedAt: new Date() });
    }
  }
  async revokeFamily(familyId: string): Promise<void> {
    for (const [key, value] of this.tokens) {
      if (value.familyId === familyId) {
        await this.revoke(key);
      }
    }
  }
}
