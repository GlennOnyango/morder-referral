import { useGetReferralHistory } from "@/api/hooks/referrals/ReferralHistory.hook";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, formatError } from "@/utils/format";
import { Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
function HistoryTimeline({
  referralCode,
  accessToken,
}: {
  referralCode: string;
  accessToken?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const historyQuery = useGetReferralHistory(referralCode, accessToken, {
    enabled: expanded && referralCode.length > 0,
  });

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 px-5 py-5">
        <button
          type="button"
          className="flex items-center justify-between gap-2 w-full"
          onClick={() => setExpanded((p) => !p)}
        >
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-slate-400" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Audit History
            </p>
          </div>
          {expanded ? (
            <ChevronUp className="size-4 text-slate-400" />
          ) : (
            <ChevronDown className="size-4 text-slate-400" />
          )}
        </button>

        {expanded && (
          <div className="flex flex-col gap-0 mt-1">
            {historyQuery.isLoading && (
              <p className="text-sm text-slate-400 italic py-2">Loading history…</p>
            )}
            {historyQuery.isError && (
              <p className="text-xs text-rose-600">{formatError(historyQuery.error)}</p>
            )}
            {historyQuery.data?.length === 0 && (
              <p className="text-sm text-slate-400 italic">No history events recorded.</p>
            )}
            {historyQuery.data && historyQuery.data.length > 0 && (
              <ol className="relative border-l border-slate-200 ml-2 flex flex-col gap-0">
                {historyQuery.data.map((entry, i) => (
                  <li
                    key={entry.id ?? `${entry.action ?? "event"}-${i}`}
                    className="ml-4 pb-5 last:pb-0"
                  >
                    <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-white bg-slate-300" />
                    <p className="text-xs font-semibold text-slate-700">
                      {entry.action ?? "Event"}
                    </p>
                    {entry.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{entry.description}</p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {entry.actorName ?? entry.actorSub ?? "System"} &middot;{" "}
                      {formatDateTime(entry.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default HistoryTimeline;
