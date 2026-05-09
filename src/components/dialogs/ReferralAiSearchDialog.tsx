import { Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

interface ReferralAiSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

function ReferralAiSearchDialog({
  open,
  onOpenChange,
  prompt,
  onPromptChange,
  onSubmit,
  isSubmitting,
}: ReferralAiSearchDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <p className="eyebrow">AI Search</p>
          <DialogTitle>Search Referrals with Natural Language</DialogTitle>
          <DialogDescription>
            Describe what you are looking for. We will pass your exact prompt to semantic search.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="flex flex-col gap-4"
        >
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700" htmlFor="ai-search-prompt">
            Your search prompt
            <textarea
              id="ai-search-prompt"
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              rows={4}
              placeholder="Example: urgent cardiology referrals for elderly patients from county referral hospitals"
              autoFocus
              disabled={isSubmitting}
              className="w-full resize-none rounded-xl border border-teal-900/19 bg-white/95 px-3.5 py-2.5 font-[inherit] text-[0.95rem] text-[#0d2230] transition-[border-color,box-shadow] duration-160 ease-out placeholder:text-[#506071]/60 focus:border-emerald-700/70 focus:outline-none focus:shadow-[0_0_0_3px_rgba(17,122,101,0.13)] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onPromptChange("")}
              disabled={prompt.length === 0 || isSubmitting}
            >
              Clear
            </Button>
            <Button type="submit" disabled={isSubmitting || prompt.trim().length === 0}>
              <Sparkles className="size-4" />
              {isSubmitting ? "Searching..." : "Search"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ReferralAiSearchDialog;
