import { z } from "zod";

export const FACILITY_CODE_MIN_LENGTH = 2;

export const signInSchema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export type SignInFormValues = z.infer<typeof signInSchema>;

export type SignUpRole = "member" | "admin";

export const signUpSchema = z.object({
  role: z.enum(["member", "admin"]),
  name: z.string().min(1, { message: "Name is required." }),
  email: z.string().trim().email({ message: "Enter a valid email address." }),
  phoneNumber: z.string().min(1, { message: "Phone number is required." }),
  birthdate: z.string().min(1, { message: "Birthdate is required." }),
  facility_code: z.string(),
  password: z.string().min(1, { message: "Password is required." }),
}).superRefine((data, ctx) => {
  if (data.role === "member" && data.facility_code.trim().length < FACILITY_CODE_MIN_LENGTH) {
    ctx.addIssue({
      code: "custom",
      message: `Facility code must be at least ${FACILITY_CODE_MIN_LENGTH} characters.`,
      path: ["facility_code"],
    });
  }
});

export type SignUpFormValues = z.infer<typeof signUpSchema>;

export const resetSchema = z.object({
  username: z.string().min(1, { message: "Email or username is required." }),
  code: z.string(),
  newPassword: z.string(),
});

export type ResetFormValues = z.infer<typeof resetSchema>;

export const confirmSchema = z.object({
  code: z.string().min(1, { message: "Confirmation code is required." }),
});

export type ConfirmFormValues = z.infer<typeof confirmSchema>;
