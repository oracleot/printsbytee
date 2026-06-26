import bcrypt from 'bcryptjs';

/**
 * Password hashing and verification.
 *
 * Uses `bcryptjs` (pure-JS) rather than the native `bcrypt` package so
 * the API deploys on any Node host (Railway, Vercel, Docker alpine,
 * …) without a node-gyp / python / make toolchain. For an owner-only
 * login endpoint that runs at most a handful of times per day, the
 * ~3× CPU cost vs. the native binding is irrelevant.
 *
 * Cost factor is 12 (≈ 250 ms native, ≈ 700 ms bcryptjs on the
 * reference machine). 12 is the 2024 default recommended by OWASP and
 * matches the bcrypt module's documented baseline — raising it later
 * is a single constant edit here, and existing hashes remain valid
 * because the cost is encoded in each hash string.
 *
 * Hash format compatibility: bcryptjs produces `$2a$…` strings that
 * are accepted by both `bcrypt.compare` and `bcryptjs.compare`, so
 * swapping implementations later does not invalidate stored hashes.
 */

const BCRYPT_COST = 12;

/**
 * Hash a plaintext password into a bcrypt string suitable for storage
 * in `users.password_hash`.
 *
 * Returns the hash, never the plaintext. The caller must not log it.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

/**
 * Compare a candidate plaintext against a stored bcrypt hash.
 *
 * Returns `false` for any failure (wrong password, malformed hash,
 * empty input). The error envelope returned to the client must NOT
 * distinguish between "user not found" and "wrong password" — both
 * surface as `UNAUTHORIZED` from the auth route. The internal call
 * here is constant-time at the bcrypt level (`bcrypt.compare` walks
 * the same number of rounds regardless of match outcome).
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    // Malformed hash (e.g. legacy plaintext row from a future schema
    // change). Treat as a verification failure, not as a 500.
    return false;
  }
}