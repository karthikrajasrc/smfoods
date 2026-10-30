import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const keyLength = 64;

function deriveKey(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(key);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, saltHex, keyHex] = passwordHash.split("$");
  if (algorithm !== "scrypt" || !saltHex || !keyHex || !/^[a-f\d]+$/i.test(saltHex) || !/^[a-f\d]+$/i.test(keyHex)) {
    return false;
  }
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(keyHex, "hex");
  if (salt.length !== 16 || expected.length !== keyLength) return false;
  const actual = await deriveKey(password, salt);
  return timingSafeEqual(actual, expected);
}
