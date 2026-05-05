import { useNavigate } from "react-router-dom";
import { Eye, X } from "lucide-react";
import { useAuthContext } from "../context/useAuthContext";

export function ImpersonationBanner() {
  const { impersonatedOrg, stopImpersonation } = useAuthContext();
  const navigate = useNavigate();

  if (!impersonatedOrg) return null;

  const handleStop = () => {
    stopImpersonation();
    navigate("/system/admin", { replace: true });
  };

  return (
    <div className="impersonation-banner">
      <Eye size={14} className="shrink-0" />
      <span>
        Viewing as <strong>{impersonatedOrg.name}</strong> — changes you make affect this organisation.
      </span>
      <button type="button" onClick={handleStop} className="impersonation-banner-stop">
        <X size={13} />
        Stop impersonation
      </button>
    </div>
  );
}
