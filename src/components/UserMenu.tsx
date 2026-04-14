import { Link } from "react-router-dom";
import { LogOut01Icon, Settings01Icon, Settings02Icon } from "@untitledui/icons-react/outline";
import { useAuthContext } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "./ui/popover";

const ITEM_CLS = "inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold";

const UserMenu = () => {
  const { logout } = useAuthContext();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-10 rounded-full border border-slate-700/20 bg-white/80"
          aria-haspopup="menu"
          aria-label="Open account menu"
        >
          <Settings02Icon aria-hidden="true" className="size-5" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end">
        <PopoverClose asChild>
          <Link
            to="/settings"
            role="menuitem"
            className={`${ITEM_CLS} text-slate-800 hover:bg-slate-100 no-underline`}
          >
            <Settings01Icon aria-hidden="true" className="size-4 shrink-0" />
            Settings
          </Link>
        </PopoverClose>

        <PopoverClose asChild>
          <Button
            variant="ghost"
            role="menuitem"
            className={`${ITEM_CLS} text-rose-700 hover:bg-rose-50`}
            onClick={() => void logout()}
          >
            <LogOut01Icon aria-hidden="true" className="size-4 shrink-0" />
            Sign out
          </Button>
        </PopoverClose>
      </PopoverContent>
    </Popover>
  );
};

export default UserMenu;
