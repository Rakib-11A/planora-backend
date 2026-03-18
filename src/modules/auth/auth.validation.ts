import { z } from "zod";

// Shared helpers
const emailField = z
  .string({ required_error: "Email is required", invalid_type_error: "Email must be a string" })
  .trim()
  .toLowerCase()
  .email({ message: "Enter a valid email address" });

const strongPassword = z
  .string({ required_error: "Password is required", invalid_type_error: "Password must be a string" })
  .min(8, { message: "Password must be at least 8 characters" })
  .regex(/[A-Z]/, { message: "Password must include an uppercase letter" })
  .regex(/[a-z]/, { message: "Password must include a lowercase letter" })
  .regex(/[0-9]/, { message: "Password must include a number" });

const otpField = z
  .string({ required_error: "OTP is required", invalid_type_error: "OTP must be a string" })
  .regex(/^\d{6}$/, { message: "OTP must be 6 digits" });

// 1) Register
export const registerSchema = z.object({
  name: z
    .string({ required_error: "Name is required", invalid_type_error: "Name must be a string" })
    .trim()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(50, { message: "Name must be at most 50 characters" }),
  email: emailField,
  password: strongPassword,
});
export type RegisterSchema = z.infer<typeof registerSchema>;

// 2) Login
export const loginSchema = z.object({
  email: emailField,
  password: z
    .string({ required_error: "Password is required", invalid_type_error: "Password must be a string" })
    .min(1, { message: "Password is required" }),
});
export type LoginSchema = z.infer<typeof loginSchema>;

// 3) Verify Email
export const verifyEmailSchema = z.object({
  email: emailField,
  otp: otpField,
});
export type VerifyEmailSchema = z.infer<typeof verifyEmailSchema>;

// 4) Resend OTP
export const resendOtpSchema = z.object({
  email: emailField,
});
export type ResendOtpSchema = z.infer<typeof resendOtpSchema>;

// 5) Forgot Password
export const forgotPasswordSchema = z.object({
  email: emailField,
});
export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

// 6) Reset Password
export const resetPasswordSchema = z
  .object({
    email: emailField,
    otp: otpField,
    newPassword: strongPassword,
    confirmPassword: z
      .string({ required_error: "Confirm password is required", invalid_type_error: "Confirm password must be a string" })
      .min(1, { message: "Confirm password is required" }),
  })
  .refine((val) => val.newPassword === val.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;

// 7) Change Password
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: "Current password is required", invalid_type_error: "Current password must be a string" })
      .min(1, { message: "Current password is required" }),
    newPassword: strongPassword,
    confirmPassword: z
      .string({ required_error: "Confirm password is required", invalid_type_error: "Confirm password must be a string" })
      .min(1, { message: "Confirm password is required" }),
  })
  .refine((val) => val.newPassword === val.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>;

