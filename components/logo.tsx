import { Gamepad2 } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-500/18 text-indigo-200 ring-1 ring-indigo-300/30">
        <Gamepad2 className="h-6 w-6" />
      </div>
      <div>
        <p className="text-xl font-black tracking-normal text-white">GameHub</p>
        <p className="text-xs text-slate-400">Campus Game Forum</p>
      </div>
    </div>
  );
}
