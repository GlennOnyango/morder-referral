import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateServiceRequest } from "../../../../api/hooks/serviceRequests/CreateServiceRequest.hook";
import { useGetAllServices } from "../../../../api/hooks/services/AllServices.hook";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import { formatError } from "../../../../utils/format";

function ServiceRequestForm({
  organizationId,
  currentOrgDbId,
  accessToken,
  onSuccess,
  onCancel,
}: {
  organizationId: string;
  currentOrgDbId: string | undefined;
  accessToken: string | undefined;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [requestDetails, setRequestDetails] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [neededBy, setNeededBy] = useState("");

  const allServicesQuery = useGetAllServices(accessToken);
  const services = allServicesQuery.data ?? [];

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const providerOrgId = selectedService?.organization_id;

  const createMutation = useCreateServiceRequest(accessToken, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-requests", "outgoing", organizationId] });
      onSuccess();
    },
  });

  const handleSubmit = () => {
    if (!currentOrgDbId || !providerOrgId || !selectedServiceId || !requestDetails.trim()) return;
    createMutation.mutate({
      requesting_organization_id: currentOrgDbId,
      provider_organization_id: providerOrgId,
      service_id: selectedServiceId,
      request_details: requestDetails.trim(),
      priority: priority || undefined,
      needed_by: neededBy || undefined,
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold text-slate-600">New Service Request</p>

      <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Service
        {allServicesQuery.isLoading ? (
          <Input disabled placeholder="Loading services…" />
        ) : (
          <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a service" />
            </SelectTrigger>
            <SelectContent>
              {services.map((svc) => (
                <SelectItem key={svc.id ?? ""} value={svc.id ?? ""}>
                  {svc.service_name ?? svc.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </label>

      <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Request Details
        <textarea
          className="w-full resize-none rounded-xl border border-teal-900/19 bg-white/95 px-3.5 py-2.5 font-[inherit] normal-case text-[0.9rem] tracking-normal text-[#0d2230] placeholder:text-[#506071]/60 focus:border-emerald-700/70 focus:outline-none focus:shadow-[0_0_0_3px_rgba(17,122,101,0.13)]"
          rows={3}
          value={requestDetails}
          onChange={(e) => setRequestDetails(e.target.value)}
          placeholder="Describe what you need from the provider"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Priority
          <Select
            value={priority}
            onValueChange={(v) => setPriority(v as "low" | "normal" | "high" | "urgent")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Needed By
          <Input
            type="date"
            value={neededBy}
            onChange={(e) => setNeededBy(e.target.value)}
          />
        </label>
      </div>

      {createMutation.isError && (
        <p className="text-xs text-rose-600">{formatError(createMutation.error)}</p>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          className="flex-1 text-xs"
          onClick={handleSubmit}
          disabled={
            createMutation.isPending ||
            !selectedServiceId ||
            !requestDetails.trim() ||
            !providerOrgId
          }
        >
          {createMutation.isPending ? "Submitting…" : "Submit Request"}
        </Button>
        <Button type="button" variant="outline" className="text-xs" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default ServiceRequestForm;
