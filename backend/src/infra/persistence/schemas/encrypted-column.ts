import { customType } from 'drizzle-orm/pg-core';

// Binary ciphertext only. Encryption, authentication and key rotation belong to
// the application service introduced after the PR 4.15 security gate.
export const encryptedBytes = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});
