import { z } from "zod";

export const organizationSchema = z.object({
  name: z.string().min(1, { message: "Facility name is required." }),
  facility_code: z.string().min(1, { message: "Facility code is required." }),
  county: z.string().min(1, { message: "County is required." }),
  subcounty: z.string().min(1, { message: "Sub-county is required." }),
  ward: z.string().min(1, { message: "Ward is required." }),
  transport_available: z.boolean(),
  level: z.string().min(1, { message: "Level is required." }),
  lat: z.string().min(1, { message: "Latitude is required." }),
  lng: z.string().min(1, { message: "Longitude is required." }),
  ownership_type: z.enum(["public", "private", "faith_based"]),
});

export type OrganizationFormValues = z.infer<typeof organizationSchema>;
