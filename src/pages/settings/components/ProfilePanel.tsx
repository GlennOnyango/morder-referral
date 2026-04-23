import type { AppRole } from "../../../context/authTypes";

type ProfilePanelProps = {
  email: string | undefined;
  roles: AppRole[];
  facilityId: string | undefined;
  staffFacilityCode: string;
};

const ProfilePanel = ({ email, roles, facilityId, staffFacilityCode }: ProfilePanelProps) => {
  const items = [
    { label: "Email", value: email ?? "Unknown user" },
    { label: "Roles", value: roles.length > 0 ? roles.join(", ") : "UNASSIGNED" },
    { label: "Session facility ID", value: facilityId ?? "Not assigned" },
    { label: "Resolved facility code", value: staffFacilityCode || "Not resolved" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">User Details</h2>
        <p className="text-sm text-slate-500">Current account information and access scope.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map(({ label, value }) => (
          <article key={label} className="rounded-xl border border-slate-200 bg-white p-3">
            <small className="text-xs font-medium text-slate-500">{label}</small>
            <strong className="mt-0.5 block text-sm text-slate-900">{value}</strong>
          </article>
        ))}
      </div>
    </div>
  );
};

export default ProfilePanel;
