import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, BCRYPT_ROUNDS);
}

export async function verifyOtp(
  plainOtp: string,
  hashedOtp: string,
): Promise<boolean> {
  return bcrypt.compare(plainOtp, hashedOtp);
}

export function getOtpExpiry(): Date {
  return new Date(Date.now() + 10 * 60 * 1000);
}
