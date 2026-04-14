import { Button } from "../../components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { listOrganizations } from "../../api/organizations";
import Breadcrumbs from "../../components/Breadcrumbs";
import { useAuthContext } from "../../context/AuthContext";
import {
  canManageFacilityCatalog,
  isFacilityManager,
  isOrganizationOwnedBySessionFacility,
} from "../../utils/facilityAccess";

function formatError(error: unknown): string {
  if (isAxiosError(error)) {
    const payload = error.response?.data;
    if (payload && typeof payload === "object" && "message" in payload) {
      const value = (payload as { message?: unknown }).message;
      if (typeof value === "string") {
        return value;
      }
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Request failed. Please try again.";
}

type WardOption = {
  name: string;
};

type SubcountyOption = {
  name: string;
  wards: WardOption[];
};

type CountyOption = {
  name: string;
  code: string;
  subcounties: SubcountyOption[];
};

function normalizeCountyCode(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toString().padStart(3, "0");
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim().padStart(3, "0");
  }

  return "";
}

function readStringFromRecord(source: unknown, keys: string[]): string {
  if (!source || typeof source !== "object") {
    return "";
  }

  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "";
}

function readTransportAvailability(organization: unknown): boolean {
  if (!organization || typeof organization !== "object") {
    return false;
  }

  const record = organization as Record<string, unknown>;
  const value = record.transport_available ?? record.transportAvailable;
  return typeof value === "boolean" ? value : false;
}

function TransportIcon({ level }: { level?: number }) {
  if (typeof level === "number" && level >= 4) {
    return (
      <svg className="facility-transport-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 6h11v9H3z" fill="currentColor" opacity="0.85" />
        <path d="M14 9h4l3 3v3h-7z" fill="currentColor" />
        <circle cx="7" cy="17" r="2.2" fill="currentColor" />
        <circle cx="18" cy="17" r="2.2" fill="currentColor" />
        <path d="M8.5 8.5h2v2h2v2h-2v2h-2v-2h-2v-2h2z" fill="#fff" />
      </svg>
    );
  }

  return (
    <svg className="facility-transport-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 7h12v8H2z" fill="currentColor" opacity="0.85" />
      <path d="M14 10h4l3 3v2h-7z" fill="currentColor" />
      <circle cx="7" cy="17" r="2.2" fill="currentColor" />
      <circle cx="18" cy="17" r="2.2" fill="currentColor" />
    </svg>
  );
}

function OrganizationsPage() {
  const { session, isAuthenticated } = useAuthContext();
  const role = session?.role;
  const canManageOrganizations = isFacilityManager(role);
  const canManageCatalog = canManageFacilityCatalog(role);
  const [currentPage, setCurrentPage] = useState(1);
  const facilitiesPerPage = 9;

  const organizationsQuery = useQuery({
    queryKey: ["organizations", session?.accessToken],
    queryFn: () => listOrganizations(session?.accessToken),
    enabled: isAuthenticated && canManageOrganizations,
  });
  const countyOptionsQuery = useQuery({
    queryKey: ["kenya-administrative-units"],
    queryFn: async (): Promise<CountyOption[]> => {
      const response = await fetch("/kenya-administrative-units.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Could not load county data.");
      }
      return (await response.json()) as CountyOption[];
    },
    staleTime: Infinity,
  });
  const scopedOrganization =
    role === "HOSPITAL_ADMIN" && organizationsQuery.data
      ? organizationsQuery.data.find((organization) =>
          isOrganizationOwnedBySessionFacility(organization, session?.facilityId),
        )
      : undefined;

  const paginatedFacilities = useMemo(() => {
    const organizations = organizationsQuery.data ?? [];
    const totalPages = Math.max(1, Math.ceil(organizations.length / facilitiesPerPage));
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * facilitiesPerPage;
    const end = start + facilitiesPerPage;

    return {
      totalPages,
      safePage,
      items: organizations.slice(start, end),
    };
  }, [organizationsQuery.data, currentPage]);
  const countiesByCode = useMemo(() => {
    const map = new Map<string, CountyOption>();
    for (const county of countyOptionsQuery.data ?? []) {
      map.set(county.code, county);
    }
    return map;
  }, [countyOptionsQuery.data]);

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (role === "HOSPITAL_ADMIN") {
    if (!session?.facilityId) {
      return (
        <section className="org-shell reveal delay-1">
          <article className="access-note error-block">
            <h2>Missing facility assignment</h2>
            <p>Could not resolve your `facility_id` from token claims. Sign in again or contact support.</p>
          </article>
        </section>
      );
    }

    if (organizationsQuery.isLoading) {
      return (
        <section className="org-shell reveal delay-1">
          <article className="access-note">
            <h2>Loading facility</h2>
            <p>Resolving your assigned facility...</p>
          </article>
        </section>
      );
    }

    if (organizationsQuery.isError) {
      return (
        <section className="org-shell reveal delay-1">
          <article className="access-note error-block">
            <h2>Could not load facility</h2>
            <p>{formatError(organizationsQuery.error)}</p>
          </article>
        </section>
      );
    }

    if (scopedOrganization?.id) {
      return <Navigate to={`/facilities/${scopedOrganization.id}`} replace />;
    }

    return (
      <section className="org-shell reveal delay-1">
        <article className="access-note error-block">
          <h2>Assigned facility not found</h2>
          <p>We could not match your assigned facility to an organization record.</p>
        </article>
      </section>
    );
  }

  return (
    <section className="org-shell reveal delay-1">
      <div className="org-header">
        <div>
          <p className="eyebrow">Facilities</p>
          <h1>Manage facilities</h1>
          <p>View and update facilities, then open each facility workspace for services, users, and referrals.</p>
        </div>
        {canManageCatalog ? (
          <Link className="btn btn-primary" to="/facilities/new">
            Create Facility
          </Link>
        ) : null}
      </div>

      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Dashboard", to: "/dashboard" },
          { label: "Facilities" },
        ]}
      />

      {!canManageOrganizations ? (
        <article className="access-note">
          <h2>Restricted facilities module</h2>
          <p>Only users with `HOSPITAL_ADMIN` or `SUPER_ADMIN` role can manage facilities.</p>
        </article>
      ) : null}

      {canManageOrganizations && organizationsQuery.isLoading ? (
        <article className="access-note">
          <h2>Loading facilities</h2>
          <p>Fetching latest facility data...</p>
        </article>
      ) : null}

      {canManageOrganizations && organizationsQuery.isError ? (
        <article className="access-note error-block">
          <h2>Could not load facilities</h2>
          <p>{formatError(organizationsQuery.error)}</p>
        </article>
      ) : null}

      {canManageOrganizations && countyOptionsQuery.isError ? (
        <article className="access-note error-block">
          <h2>Could not load county reference data</h2>
          <p>{formatError(countyOptionsQuery.error)}</p>
        </article>
      ) : null}

      {canManageOrganizations && organizationsQuery.data ? (
        <article className="org-table-card">
          {organizationsQuery.data.length === 0 ? (
            <p className="org-empty">No facilities found. Create the first one.</p>
          ) : (
            <div className="facilities-grid">
              {paginatedFacilities.items.map((organization) => {
                const organizationId = organization.id ?? "";
                const organizationName = organization.name ?? "Unnamed facility";
                const transportAvailable = readTransportAvailability(organization);
                const countyCode = normalizeCountyCode(organization.county);
                const county = countyCode ? countiesByCode.get(countyCode) : undefined;
                const subcounty = readStringFromRecord(organization, ["sub_county", "subCounty"]);
                const ward = readStringFromRecord(organization, ["ward"]);

                return (
                  <article key={organizationId || organizationName} className="facility-card">
                    <div className="facility-card-header">
                      <h2>
                        {organizationId ? (
                          <Link className="org-link" to={`/facilities/${organizationId}`}>
                            {organizationName}
                          </Link>
                        ) : (
                          organizationName
                        )}
                      </h2>
                      <p>{organization.facility_code ?? "-"}</p>
                    </div>

                    <dl className="facility-card-meta">
                      <div>
                        <dt>County</dt>
                        <dd>{county?.name ?? (countyCode || "-")}</dd>
                      </div>
                      <div>
                        <dt>Sub-county</dt>
                        <dd>{subcounty || "-"}</dd>
                      </div>
                      <div>
                        <dt>Ward</dt>
                        <dd>{ward || "-"}</dd>
                      </div>
                      <div>
                        <dt>Level</dt>
                        <dd>{organization.level ?? "-"}</dd>
                      </div>
                      <div>
                        <dt>Ownership</dt>
                        <dd>{organization.ownership_type ?? "-"}</dd>
                      </div>
                      <div>
                        <dt>Transport</dt>
                        <dd>
                          {transportAvailable ? (
                            <span className="facility-transport-badge">
                              <TransportIcon level={organization.level} />
                              <span>Transportation available</span>
                            </span>
                          ) : (
                            "Not available"
                          )}
                        </dd>
                      </div>
                    </dl>

                    <div className="org-actions">
                      {organizationId ? (
                        <Link className="btn btn-ghost org-btn" to={`/facilities/${organizationId}/edit`}>
                          Edit
                        </Link>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {organizationsQuery.data.length > facilitiesPerPage ? (
            <div className="facilities-pagination">
              <p className="facilities-page-indicator">
                Page {paginatedFacilities.safePage} of {paginatedFacilities.totalPages}
              </p>
              <div className="facilities-pagination-actions">
                <Button
                  type="button"
                  className="btn btn-ghost facilities-pagination-btn"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={paginatedFacilities.safePage <= 1}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  className="btn btn-ghost facilities-pagination-btn"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(paginatedFacilities.totalPages, page + 1))
                  }
                  disabled={paginatedFacilities.safePage >= paginatedFacilities.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}

export default OrganizationsPage;
