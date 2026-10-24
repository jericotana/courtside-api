import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type SiteverifyResponse = {
  success: boolean;
  'error-codes': string[];
};

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  constructor(private readonly config: ConfigService) {}

  /** Throws unless Cloudflare confirms the token. Each token can only be checked once. */
  async verify(token: string): Promise<void> {
    let result: SiteverifyResponse;
    try {
      const res = await fetch(SITEVERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: this.config.getOrThrow<string>('TURNSTILE_SECRET_KEY'),
          response: token,
        }),
        signal: AbortSignal.timeout(5000),
      });
      result = (await res.json()) as SiteverifyResponse;
    } catch (err) {
      this.logger.error('Turnstile siteverify failed', err);
      throw new ServiceUnavailableException(
        'Security check unavailable. Try again.',
      );
    }

    if (!result.success) {
      this.logger.warn(
        `Turnstile rejected: ${result['error-codes'].join(', ')}`,
      );
      throw new BadRequestException('Security check failed');
    }
  }
}
