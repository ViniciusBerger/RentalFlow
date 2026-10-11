import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export type SealedData = {
  ciphertext: Buffer;
  nonce: Buffer;
  authTag: Buffer;
  keyVersion: string;
  sha256: string;
};
export type SealedComponents = Omit<SealedData, 'sha256'>;

/**
 * Envelope AES-256-GCM encryption. AAD binds ciphertext to both tenant and
 * resource, so a database writer cannot swap identities across records.
 * Keys are supplied only via the server secret manager.
 */
export class ContractDataCrypto {
  private readonly keys: Map<string, Buffer>;
  private readonly active: string;
  constructor(source = process.env.CONTRACT_DATA_KEYS, active = process.env.CONTRACT_ACTIVE_KEY_VERSION) {
    if (!source || !active) throw new Error('Contract encryption keys are not configured');
    let parsed: unknown;
    try { parsed = JSON.parse(source); } catch { throw new Error('Contract encryption key configuration is invalid'); }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Contract encryption key configuration is invalid');
    this.keys = new Map();
    for (const [version, encoded] of Object.entries(parsed)) {
      if (!/^[a-zA-Z0-9_-]{1,32}$/.test(version) || typeof encoded !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(encoded)) {
        throw new Error('Invalid encryption key version or encoding');
      }
      const key = Buffer.from(encoded, 'base64');
      if (key.length !== 32 || key.toString('base64') !== encoded) throw new Error('Encryption keys must contain exactly 32 random bytes');
      this.keys.set(version, key);
    }
    if (!this.keys.has(active)) throw new Error('Active encryption key version not found');
    this.active = active;
  }
  private context(userId: string, kind: string, resourceId: string): Buffer {
    if (!userId || !kind || !resourceId) throw new Error('Encryption ownership context required');
    return Buffer.from(JSON.stringify(['rentalflow-contract-v1', userId, kind, resourceId]), 'utf8');
  }
  seal(value: Buffer, userId: string, kind: string, resourceId: string): SealedData {
    if (value.length > 5_000_000) throw new Error('Encrypted payload exceeds size limit');
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.keys.get(this.active)!, nonce);
    cipher.setAAD(this.context(userId, kind, resourceId));
    const ciphertext = Buffer.concat([cipher.update(value), cipher.final()]);
    return {ciphertext, nonce, authTag: cipher.getAuthTag(), keyVersion: this.active,
      sha256: createHash('sha256').update(value).digest('hex')};
  }
  open(value: SealedData, userId: string, kind: string, resourceId: string): Buffer {
    const key = this.keys.get(value.keyVersion);
    if (!key) throw new Error('Encryption key version unavailable');
    if (value.nonce.length !== 12 || value.authTag.length !== 16 ||
        !/^[a-f0-9]{64}$/.test(value.sha256)) throw new Error('Invalid encrypted payload');
    const decipher = createDecipheriv('aes-256-gcm', key, value.nonce);
    decipher.setAAD(this.context(userId, kind, resourceId));
    decipher.setAuthTag(value.authTag);
    const clear = Buffer.concat([decipher.update(value.ciphertext), decipher.final()]);
    const digest = Buffer.from(createHash('sha256').update(clear).digest('hex'), 'hex');
    if (!timingSafeEqual(digest, Buffer.from(value.sha256, 'hex'))) throw new Error('Encrypted document integrity verification failed');
    return clear;
  }
}
