import { z } from "zod";

export const referralSchema = z.object({
  serviceType: z.string().min(1, { message: "Service type is required." }),
  priority: z.enum(["routine", "urgent", "emergency"]),
  modeOfPayment: z.enum(["cash", "mpesa", "insurance"]),
  insuranceProvider: z.string(),
  patientFullName: z.string().min(1, { message: "Patient full name is required." }),
  patientYearOfBirth: z.string().min(1, { message: "Year of birth is required." }),
  patientGender: z.enum(["male", "female"]),
  patientDiagnosis: z.string(),
  reasonForReferral: z.string().min(1, { message: "Reason for referral is required." }),
  clinicalSummary: z.string(),
  notes: z.string(),
});

export type ReferralFormValues = z.infer<typeof referralSchema>;
