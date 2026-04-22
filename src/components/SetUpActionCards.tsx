import { useState } from "react";
import CreateFacilityDialog from "./dialogs/CreateFacilityDialog";
import CreateServiceAccountDialog from "./dialogs/CreateServiceAccountDialog";

interface ActionsArray {
  type: string;
  title: string;
  description: string;
  actionText: string;
  actionModel: "organization" | "service" | null;
}

const actionsArray: ActionsArray[] = [
  {
    type: "Facility",
    title: "Create Facility",
    description: "Register your healthcare facility on the referral network.",
    actionText: "Get started →",
    actionModel: "organization",
  },
  {
    type: "Service Provider",
    title: "Create Service Provider Account",
    description:
      "Set up a service provider organisation for referral management.",
    actionText: "Get started →",
    actionModel: "service",
  },
];

export default function SetupActionCards() {
  const [modal, setModal] = useState<null | "organization" | "service">(null);

  return (
    <>
      <div className="grid sm:grid-cols-2 gap-4">
        {actionsArray.map((e: ActionsArray) => (
          <button
            type="button"
            onClick={() => setModal(e.actionModel)}
            className="group flex flex-col gap-2 rounded-2xl border border-[rgba(10,52,60,0.13)] bg-[rgba(255,255,255,0.82)] p-6 shadow-sm transition-shadow hover:shadow-md text-left"
          >
            <p className="eyebrow">{e.type}</p>
            <h3 className="font-heading text-[1.05rem] font-bold text-[#0d2230] leading-tight">
              {e.title}
            </h3>
            <p className="text-[0.9rem] text-[#506071] leading-relaxed">
              {e.description}
            </p>
            <span className="mt-auto text-[0.85rem] font-semibold text-[#0f5a78] group-hover:underline">
              {e.actionText}
            </span>
          </button>
        ))}
      </div>

      <CreateFacilityDialog
        open={modal === "organization"}
        onClose={() => setModal(null)}
      />
      <CreateServiceAccountDialog
        open={modal === "service"}
        onClose={() => setModal(null)}
      />
    </>
  );
}
