const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

function hasPgCode(error: unknown, code: string): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const err = error as { code?: string; cause?: { code?: string } };
  return (err.code ?? err.cause?.code) === code;
}

export function isUniqueViolation(error: unknown): boolean {
  return hasPgCode(error, PG_UNIQUE_VIOLATION);
}

export function isForeignKeyViolation(error: unknown): boolean {
  return hasPgCode(error, PG_FOREIGN_KEY_VIOLATION);
}
