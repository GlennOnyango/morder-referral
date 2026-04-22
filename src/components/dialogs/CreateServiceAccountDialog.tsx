import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useAuthContext } from "../../context/useAuthContext";

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

export default function CreateServiceAccountDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { session } = useAuthContext();
  const queryClient = useQueryClient();
  const [serviceName, setServiceName] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (payload: OrganizationCreateInput) =>
      createOrganization(payload, session?.accessToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      setServiceName("");
      setValidationError(null);
      onClose();
    },
  });

  const handleClose = () => {
    setServiceName("");
    setValidationError(null);
    createMutation.reset();
    onClose();
  };

  const handleServiceSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationError(null);
    createMutation.mutate({
      name: serviceName.trim(),
      organization_type: "service",
      facility_code: "",
      county: 0,
      sub_county: "",
      ward: "",
      transport_available: false,
      level: 0,
      lat: 0,
      lng: 0,
      ownership_type: "public",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Service Provider Account</DialogTitle>
          <DialogDescription>
            This account will allow you to provide services to facilities that
            conduct referrals.
          </DialogDescription>
        </DialogHeader>
        <form className="org-form" onSubmit={handleServiceSubmit}>
          <label className="field">
            <span>
              Name{" "}
              <span aria-hidden="true" className="text-red-500">*</span>
            </span>
            <input
              className="field-input"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Organization Type</span>
            <select className="field-input" value="service" disabled>
              <option value="facility">Facility</option>
              <option value="service">Service</option>
            </select>
          </label>

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
              {createMutation.isPending ? "Creating..." : "Create Facility"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
