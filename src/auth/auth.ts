import { PublicUser } from '../users/user';

export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
};

export type AuthResponse = Omit<AuthResult, 'refreshToken'>;
