import type { ModelsReferral } from "@/types/referrals.generated";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { formatError, formatDateTime } from "../../utils/format";

interface ReferralSummarizeDialogProps {
  referral: ModelsReferral | null;
  summary: string;
  isCollapsed: boolean;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onCollapsedChange: (collapsed: boolean) => void;
  onClose: () => void;
  onOpenDetail: (referralCode: string) => void;
  onRegenerate: () => void;
}

function ReferralSummarizeDialog({
  referral,
  summary,
  isCollapsed,
  isPending,
  isError,
  error,
  onCollapsedChange,
  onClose,
  onOpenDetail,
  onRegenerate,
}: ReferralSummarizeDialogProps) {
  return (
    <Dialog
      open={!!referral}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="referral-summary-dialog sm:max-w-190 max-h-[85vh] flex flex-col overflow-hidden"
        showCloseButton={false}
      >
        <div className="referral-summary-dialog-header shrink-0">
          <div>
            <p className="eyebrow">AI Assistant</p>
            <DialogTitle>Referral Summary</DialogTitle>
          </div>
          <div className="referral-summary-dialog-controls">
            <Button
              type="button"
              className="btn btn-ghost org-btn"
              onClick={() => onCollapsedChange(!isCollapsed)}
            >
              {isCollapsed ? "Expand" : "Collapse"}
            </Button>
            <Button type="button" className="btn btn-ghost org-btn" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {!isCollapsed ? (
          <div className="referral-summary-dialog-body overflow-y-auto flex-1 min-h-0">
            <dl className="referral-summary-snapshot">
              <div><dt>Referral</dt><dd>{referral?.referralCode ?? "-"}</dd></div>
              <div><dt>Status</dt><dd>{referral?.status ?? "-"}</dd></div>
              <div><dt>Service</dt><dd>{referral?.serviceType ?? "-"}</dd></div>
              <div><dt>Priority</dt><dd>{referral?.priority ?? "-"}</dd></div>
              <div><dt>Origin</dt><dd>{referral?.originFacilityCode ?? "-"}</dd></div>
              <div><dt>Patient</dt><dd>{referral?.patient?.fullName ?? "-"}</dd></div>
              <div><dt>Updated</dt><dd>{formatDateTime(referral?.updatedAt)}</dd></div>
            </dl>

            <section className="referral-summary-output" aria-live="polite">
              <div className="referral-summary-output-head">
                <p>AI Narrative</p>
                {isPending ? (
                  <span className="referral-ai-summary-chip">Generating</span>
                ) : null}
              </div>
              {isError ? (
                <p className="result-note error-note referral-ai-summary-note">
                  {formatError(error)}
                </p>
              ) : null}
              {summary ? (
                <p className="referral-ai-summary-content">{summary}</p>
              ) : isPending ? (
                <p className="referral-ai-summary-placeholder">
                  Generating a concise review from the referral details...
                </p>
              ) : (
                <p className="referral-ai-summary-placeholder">
                  No summary was returned. Try again in a moment.
                </p>
              )}
            </section>

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onRegenerate}
                disabled={isPending || !referral?.referralCode}
              >
                {isPending ? "Regenerating..." : "Regenerate"}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const code = referral?.referralCode?.trim() ?? "";
                  if (code) {
                    onClose();
                    onOpenDetail(code);
                  }
                }}
                disabled={!referral?.referralCode}
              >
                Open Full Referral
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <p className="referral-summary-collapsed-note">
            Summary collapsed. Select <strong>Expand</strong> to continue reviewing this referral.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ReferralSummarizeDialog;
