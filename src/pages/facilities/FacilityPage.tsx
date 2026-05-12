import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useGetOrganizations } from "../../api/hooks/organizations/Organizations.hook";
import Breadcrumbs from "../../components/Breadcrumbs";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { formatError } from "../../utils/format";
import { useAuthContext } from "../../context/useAuthContext";
import { normalizeCountyCode, readStringFromRecord, readTransportAvailability } from "@/utils/helper";
import { Truck01Icon } from "@untitledui/icons-react/outline";
import { FACILITIES_PER_PAGE } from "@/utils/constants";

type WardOption = { name: string };
type SubcountyOption = { name: string; wards: WardOption[] };
type CountyOption = { name: string; code: string; subcounties: SubcountyOption[] };



function FacilityPage() {
  const { session, activeWorkspaceId } = useAuthContext();
  const [currentPage, setCurrentPage] = useState(1);

  const organizationsQuery = useGetOrganizations(session?.accessToken);

  const countyOptionsQuery = useQuery({
    queryKey: ["kenya-administrative-units"],
    queryFn: async (): Promise<CountyOption[]> => {
      const response = await fetch("/kenya-administrative-units.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load county data.");
      return (await response.json()) as CountyOption[];
    },
    staleTime: Infinity,
  });

  const countiesByCode = useMemo(() => {
    const map = new Map<string, CountyOption>();
    for (const county of countyOptionsQuery.data ?? []) map.set(county.code, county);
    return map;
  }, [countyOptionsQuery.data]);

  const paginatedFacilities = useMemo(() => {
    const organizations = organizationsQuery.data ?? [];
    const totalPages = Math.max(1, Math.ceil(organizations.length / FACILITIES_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * FACILITIES_PER_PAGE;
    return { totalPages, safePage, items: organizations.slice(start, start + FACILITIES_PER_PAGE) };
  }, [organizationsQuery.data, currentPage]);

  return (
    <section className="org-shell reveal delay-1">
      <Card>
        <CardContent className="flex items-end justify-between gap-3 px-5 py-4">
          <div className="flex flex-col gap-1">
            <p className="eyebrow">Facilities</p>
            <h1 className="font-heading text-2xl font-semibold -tracking-[0.03em] text-slate-900 sm:text-3xl">
              Manage facilities
            </h1>
            <p className="text-sm text-slate-500">
              View and update facilities, then open each facility workspace for services, users, and referrals.
            </p>
          </div>
          <Link className="btn btn-primary" to={`/${activeWorkspaceId}/organization/new`}>
            Create Facility
          </Link>
        </CardContent>
      </Card>

      <Breadcrumbs items={[{ label: "Organizations" }]} />

      {organizationsQuery.isLoading && (
        <article className="access-note">
          <h2>Loading facilities</h2>
          <p>Fetching latest facility data...</p>
        </article>
      )}

      {organizationsQuery.isError && (
        <article className="access-note error-block">
          <h2>Could not load facilities</h2>
          <p>{formatError(organizationsQuery.error)}</p>
        </article>
      )}

      {countyOptionsQuery.isError && (
        <article className="access-note error-block">
          <h2>Could not load county reference data</h2>
          <p>{formatError(countyOptionsQuery.error)}</p>
        </article>
      )}

      {organizationsQuery.data && (
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
                          <Link className="org-link" to={`/${organizationId}/organization`}>
                            {organizationName}
                          </Link>
                        ) : (
                          organizationName
                        )}
                      </h2>
                      <p>{organization.facility_code ?? "-"}</p>
                    </div>

                    <dl className="facility-card-meta">
                      <div><dt>County</dt><dd>{county?.name ?? (countyCode || "-")}</dd></div>
                      <div><dt>Sub-county</dt><dd>{subcounty || "-"}</dd></div>
                      <div><dt>Ward</dt><dd>{ward || "-"}</dd></div>
                      <div><dt>Level</dt><dd>{organization.level ?? "-"}</dd></div>
                      <div><dt>Ownership</dt><dd>{organization.ownership_type ?? "-"}</dd></div>
                      <div>
                        <dt>Transport</dt>
                        <dd>
                          {transportAvailable ? (
                            <span className="facility-transport-badge">
                              <Truck01Icon width={16} height={16} />
                              <span>Transportation available</span>
                            </span>
                          ) : (
                            "Not available"
                          )}
                        </dd>
                      </div>
                    </dl>

                    <div className="org-actions">
                      {organizationId && (
                        <Link className="btn btn-ghost org-btn" to={`/${organizationId}/organization/edit`}>
                          Edit
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {organizationsQuery.data.length > FACILITIES_PER_PAGE && (
            <div className="facilities-pagination">
              <p className="facilities-page-indicator">
                Page {paginatedFacilities.safePage} of {paginatedFacilities.totalPages}
              </p>
              <div className="facilities-pagination-actions">
                <Button
                  type="button"
                  className="btn btn-ghost facilities-pagination-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={paginatedFacilities.safePage <= 1}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  className="btn btn-ghost facilities-pagination-btn"
                  onClick={() => setCurrentPage((p) => Math.min(paginatedFacilities.totalPages, p + 1))}
                  disabled={paginatedFacilities.safePage >= paginatedFacilities.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </article>
      )}
    </section>
  );
}

export default FacilityPage;
