import type { ModelServiceRequest } from "../../../../types/organizations.generated";
import ServiceRequestStatusBadge from "./ServiceRequestStatusBadge";

function ServiceRequestCard({ req }: { req: ModelServiceRequest }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-slate-700 truncate">{req.service_id ?? "—"}</span>
        <ServiceRequestStatusBadge status={req.status} />
      </div>
      {req.request_details && (
        <p className="text-slate-500 line-clamp-2">{req.request_details}</p>
      )}
      {req.priority && <p className="text-slate-400">Priority: {req.priority}</p>}
      {req.needed_by && <p className="text-slate-400">Needed by: {req.needed_by}</p>}
    </div>
  );
}

export default ServiceRequestCard;
