import { useNavigate } from "react-router-dom";
import { useOrganizations } from "../../../api/hooks/organizations/Organizations.hook";
import { Button } from "../../../components/ui/button";
import { useAuthContext } from "../../../context/useAuthContext";
import type { ModelOrganization } from "../../../types/organizations.generated";

function WorkspacePanel() {
  const { session, activeWorkspaceId, setActiveWorkspace } = useAuthContext();
  const navigate = useNavigate();

  const orgsQuery = useOrganizations(session?.accessToken, {
    enabled: Boolean(session?.accessToken),
  });

  const handleActivate = (workspaceId: string, org: ModelOrganization) => {
    setActiveWorkspace(workspaceId, org);
    navigate(`/${workspaceId}/dashboard`, { replace: true });
  };

  const orgs = orgsQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-800">Workspace</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          View the organisations you belong to and switch your active workspace.
        </p>
      </div>

      {orgsQuery.isLoading && (
        <p className="text-sm text-slate-500">Loading organisations…</p>
      )}

      {orgsQuery.isError && (
        <p className="text-sm text-destructive">Could not load organisations. Try again.</p>
      )}

      {!orgsQuery.isLoading && !orgsQuery.isError && (
        <ul className="grid gap-3">
          {orgs.length === 0 && (
            <p className="text-sm text-slate-500">No organisations found for your account.</p>
          )}

          {orgs.map((org) => {
            const orgId = org.id ?? "";
            const isActive = orgId === activeWorkspaceId;
            return (
              <li
                key={orgId}
                className={`flex items-center justify-between gap-3 rounded-xl border p-4 transition-colors ${
                  isActive ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {org.name ?? "Unnamed organisation"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {org.facility_code ? (
                      <span className="font-mono">{org.facility_code}</span>
                    ) : (
                      <span className="italic">No facility code</span>
                    )}
                    {" · "}
                    <span className="capitalize">
                      {String((org as Record<string, unknown>).organization_type ?? "facility")}
                    </span>
                  </p>
                </div>

                {isActive ? (
                  <span className="shrink-0 rounded-full bg-emerald-700 px-3 py-1 text-xs font-bold text-white">
                    Active
                  </span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => handleActivate(orgId, org)}
                  >
                    Set active
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default WorkspacePanel;
