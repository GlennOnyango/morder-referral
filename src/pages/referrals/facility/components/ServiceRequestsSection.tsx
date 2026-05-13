import { Send } from "lucide-react";
import { useState } from "react";
import { useGetOutgoingServiceRequests } from "../../../../api/hooks/serviceRequests/OutgoingServiceRequests.hook";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent } from "../../../../components/ui/card";
import { formatError } from "../../../../utils/format";
import ServiceRequestCard from "./ServiceRequestCard";
import ServiceRequestForm from "./ServiceRequestForm";

function ServiceRequestsSection({
  organizationId,
  currentOrgDbId,
  accessToken,
}: {
  organizationId: string;
  currentOrgDbId: string | undefined;
  accessToken: string | undefined;
}) {
  const [showForm, setShowForm] = useState(false);

  const outgoingQuery = useGetOutgoingServiceRequests(organizationId, accessToken, {
    enabled: Boolean(organizationId),
  });

  const requests = outgoingQuery.data ?? [];

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 px-5 py-5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Service Requests
          </p>
          {!showForm && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={() => setShowForm(true)}
            >
              <Send className="size-3" />
              New Request
            </Button>
          )}
        </div>

        {showForm && (
          <ServiceRequestForm
            organizationId={organizationId}
            currentOrgDbId={currentOrgDbId}
            accessToken={accessToken}
            onSuccess={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        )}

        {outgoingQuery.isLoading && (
          <p className="text-sm text-slate-400 italic">Loading service requests…</p>
        )}
        {outgoingQuery.isError && (
          <p className="text-xs text-rose-600">{formatError(outgoingQuery.error)}</p>
        )}
        {!outgoingQuery.isLoading && requests.length === 0 && !showForm && (
          <p className="text-sm text-slate-400 italic">No outgoing service requests.</p>
        )}
        {requests.length > 0 && (
          <div className="flex flex-col gap-2">
            {requests.map((req) => (
              <ServiceRequestCard key={req.id} req={req} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ServiceRequestsSection;
