import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import {
  createOrganization,
  type OrganizationCreateInput,
} from "../../api/organizations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../ui/select";
import { useAuthContext } from "../../context/useAuthContext";

type WardOption = { name: string };
type SubcountyOption = { name: string; wards: WardOption[] };
type CountyOption = {
  name: string;
  code: string;
  subcounties: SubcountyOption[];
};

type OrgFormState = {
  name: string;
  facility_code: string;
  county: string;
  subcounty: string;
  ward: string;
  transport_available: boolean;
  level: string;
  lat: string;
  lng: string;
  ownership_type: "public" | "private" | "faith_based";
};

const defaultOrgForm: OrgFormState = {
  name: "",
  facility_code: "",
  county: "",
  subcounty: "",
  ward: "",
  transport_available: false,
  level: "",
  lat: "",
  lng: "",
  ownership_type: "public",
};

function formatOrgError(error: unknown): string {
  if (isAxiosError(error)) {
    const payload = error.response?.data;
    if (payload && typeof payload === "object" && "message" in payload) {
      const v = (payload as { message?: unknown }).message;
      if (typeof v === "string") return v;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Request failed. Please try again.";
}

export default function CreateFacilityDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { session } = useAuthContext();
  const queryClient = useQueryClient();
  const [orgForm, setOrgForm] = useState<OrgFormState>(defaultOrgForm);
  const [validationError, setValidationError] = useState<string | null>(null);

  const countyOptionsQuery = useQuery({
    queryKey: ["kenya-administrative-units"],
    queryFn: async (): Promise<CountyOption[]> => {
      const response = await fetch("/kenya-administrative-units.json", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Could not load county data.");
      return (await response.json()) as CountyOption[];
    },
    staleTime: Infinity,
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (payload: OrganizationCreateInput) =>
      createOrganization(payload, session?.accessToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      setOrgForm(defaultOrgForm);
      setValidationError(null);
      onClose();
    },
  });

  const handleClose = () => {
    setOrgForm(defaultOrgForm);
    setValidationError(null);
    createMutation.reset();
    onClose();
  };

  const handleOrgSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationError(null);
    const county = Number(orgForm.county);
    const level = Number(orgForm.level);
    const lat = orgForm.lat !== "" ? Number(orgForm.lat) : 0;
    const lng = orgForm.lng !== "" ? Number(orgForm.lng) : 0;
    if (
      [county, level].some(Number.isNaN) ||
      !orgForm.subcounty ||
      !orgForm.ward
    ) {
      setValidationError("County, sub-county, ward, and level are required.");
      return;
    }
    createMutation.mutate({
      name: orgForm.name.trim(),
      facility_code: orgForm.facility_code.trim(),
      county,
      sub_county: orgForm.subcounty,
      ward: orgForm.ward,
      transport_available: orgForm.transport_available,
      level,
      lat,
      lng,
      ownership_type: orgForm.ownership_type,
      organization_type: "facility",
    });
  };

  const countyOptions = countyOptionsQuery.data ?? [];
  const selectedCounty = countyOptions.find((c) => c.code === orgForm.county);
  const subcountyOptions = selectedCounty?.subcounties ?? [];
  const selectedSubcounty = subcountyOptions.find(
    (s) => s.name === orgForm.subcounty,
  );
  const wardOptions = selectedSubcounty?.wards ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="min-w-2/4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl">Create Facility</DialogTitle>
          <DialogDescription>
            Register a new healthcare facility on the national referral network.
            Fields marked <span className="text-red-500">*</span> are required.
          </DialogDescription>
        </DialogHeader>
        {countyOptionsQuery.isLoading && (
          <p className="text-sm text-muted-foreground">Loading county data…</p>
        )}
        <form className="org-form" onSubmit={handleOrgSubmit}>
          <div className="org-grid">
            <label className="field">
              <span>
                Facility Name{" "}
                <span aria-hidden="true" className="text-red-500">*</span>
              </span>
              <input
                className="field-input"
                value={orgForm.name}
                onChange={(e) =>
                  setOrgForm((p) => ({ ...p, name: e.target.value }))
                }
                required
              />
            </label>

            <label className="field">
              <span>
                Facility Code{" "}
                <span aria-hidden="true" className="text-red-500">*</span>
              </span>
              <input
                className="field-input"
                value={orgForm.facility_code}
                onChange={(e) =>
                  setOrgForm((p) => ({ ...p, facility_code: e.target.value }))
                }
                required
              />
            </label>
          </div>

          <div className="org-grid">
            <label className="field">
              <span>
                County{" "}
                <span aria-hidden="true" className="text-red-500">*</span>
              </span>
              <Select
                value={orgForm.county || undefined}
                onValueChange={(v) =>
                  setOrgForm((p) => ({
                    ...p,
                    county: v,
                    subcounty: "",
                    ward: "",
                  }))
                }
              >
                <SelectTrigger><SelectValue placeholder="Select county" /></SelectTrigger>
                <SelectContent>
                  {countyOptions.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="field">
              <span>
                Level (1-6){" "}
                <span aria-hidden="true" className="text-red-500">*</span>
              </span>
              <input
                className="field-input"
                type="number"
                min={1}
                max={6}
                value={orgForm.level}
                onChange={(e) =>
                  setOrgForm((p) => ({ ...p, level: e.target.value }))
                }
                required
              />
            </label>
          </div>

          <div className="org-grid">
            <label className="field">
              <span>
                Sub-county{" "}
                <span aria-hidden="true" className="text-red-500">*</span>
              </span>
              <Select
                value={orgForm.subcounty || undefined}
                onValueChange={(v) =>
                  setOrgForm((p) => ({
                    ...p,
                    subcounty: v,
                    ward: "",
                  }))
                }
                disabled={!orgForm.county}
              >
                <SelectTrigger><SelectValue placeholder="Select sub-county" /></SelectTrigger>
                <SelectContent>
                  {subcountyOptions.map((s) => (
                    <SelectItem key={s.name} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="field">
              <span>
                Ward{" "}
                <span aria-hidden="true" className="text-red-500">*</span>
              </span>
              <Select
                value={orgForm.ward || undefined}
                onValueChange={(v) =>
                  setOrgForm((p) => ({ ...p, ward: v }))
                }
                disabled={!orgForm.subcounty}
              >
                <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                <SelectContent>
                  {wardOptions.map((w) => (
                    <SelectItem key={w.name} value={w.name}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          <div className="org-grid">
            <label className="field">
              <span>Latitude</span>
              <input
                className="field-input"
                type="number"
                step="any"
                value={orgForm.lat}
                onChange={(e) =>
                  setOrgForm((p) => ({ ...p, lat: e.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Longitude</span>
              <input
                className="field-input"
                type="number"
                step="any"
                value={orgForm.lng}
                onChange={(e) =>
                  setOrgForm((p) => ({ ...p, lng: e.target.value }))
                }
              />
            </label>
          </div>

          <div className="org-grid">
            <label className="field">
              <span>Ownership Type</span>
              <Select
                value={orgForm.ownership_type}
                onValueChange={(v) =>
                  setOrgForm((p) => ({
                    ...p,
                    ownership_type: v as OrgFormState["ownership_type"],
                  }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="faith_based">Faith Based</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label className="field">
              <span>Organization Type</span>
              <Select value="facility" disabled>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="facility">Facility</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>

          <div className="field">
            <span>Transportation Available</span>
            <label className="field-checkbox" htmlFor="modal-org-transport">
              <input
                id="modal-org-transport"
                type="checkbox"
                checked={orgForm.transport_available}
                onChange={(e) =>
                  setOrgForm((p) => ({
                    ...p,
                    transport_available: e.target.checked,
                  }))
                }
              />
              <span>Transportation available</span>
            </label>
          </div>

          {validationError && (
            <p className="text-sm text-destructive">{validationError}</p>
          )}
          {createMutation.isError && (
            <p className="text-sm text-destructive">
              {formatOrgError(createMutation.error)}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Organization"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
