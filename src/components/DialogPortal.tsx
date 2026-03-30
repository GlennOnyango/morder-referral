import type { ReactNode } from "react";
import { createPortal } from "react-dom";

type DialogPortalProps = {
  children: ReactNode;
};

function DialogPortal({ children }: DialogPortalProps) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(children, document.body);
}

export default DialogPortal;
