import { z } from "zod";

export const serviceSchema = z.object({
  service_name: z.string().min(1, { message: "Service name is required." }),
  availability: z.enum(["available", "limited", "unavailable"]),
  notes: z.string(),
});

export type ServiceFormValues = z.infer<typeof serviceSchema>;
