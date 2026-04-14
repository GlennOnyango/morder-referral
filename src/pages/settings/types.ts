import type { AppRole } from "../../context/AuthContext";

export type PermissionKey =
  | "createReferrals"
  | "approveReferrals"
  | "directReferrals"
  | "manageStaff"
  | "manageSettings"
  | "aiSearch"
  | "aiReview";

export type SettingsState = {
  permissions: Record<PermissionKey, AppRole[]>;
  requireApprovalAfterCreation: boolean;
  allowDirectReferrals: boolean;
  aiEnabled: boolean;
  aiSearchEnabled: boolean;
  aiReviewEnabled: boolean;
};

export type ActivePanel = "profile" | "permissions" | "workflow" | "staff";

export type MutationInfo = {
  isPending: boolean;
  isError: boolean;
  error: unknown;
};

export type QueryInfo = {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};

export const SETTINGS_STORAGE_KEY = "refconnect.settings.v1";

export const ROLE_ORDER: AppRole[] = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE"];

export const PERMISSION_ROWS: { key: PermissionKey; label: string; description: string }[] = [
  {
    key: "createReferrals",
    label: "Create referrals",
    description: "Who can initiate a referral workflow.",
  },
  {
    key: "approveReferrals",
    label: "Approve referrals",
    description: "Who can approve referrals after creation when approval is required.",
  },
  {
    key: "directReferrals",
    label: "Direct referrals",
    description: "Who can send referrals directly to a target facility.",
  },
  {
    key: "manageStaff",
    label: "Manage staff",
    description: "Who can enable, disable, assign roles, or remove staff accounts.",
  },
  {
    key: "manageSettings",
    label: "Manage settings",
    description: "Who can edit permissions and operational settings on this page.",
  },
  {
    key: "aiSearch",
    label: "AI Search",
    description: "Who can use AI-assisted search for referrals and cases.",
  },
  {
    key: "aiReview",
    label: "AI Review",
    description: "Who can use AI-assisted case review and summaries.",
  },
];

export const NAV_ITEMS = [
  { id: "profile" as const, label: "User details" },
  { id: "permissions" as const, label: "Permissions matrix" },
  { id: "workflow" as const, label: "Workflow and AI" },
  { id: "staff" as const, label: "Staff management" },
];
