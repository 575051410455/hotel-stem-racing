// Staff-desk actions only. The separate Kiosk and the global Button keep their existing palette.
const focus = "border shadow-sm focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

export const staffActionStyles = {
  confirm: `${focus} border-white/80 bg-green-700 text-white hover:bg-green-800`,
  primary: `${focus} border-white/80 bg-blue-700 text-white hover:bg-blue-800`,
  retry: `${focus} border-amber-700 bg-amber-300 text-neutral-950 hover:bg-amber-400`,
  secondary: `${focus} border-neutral-500 bg-white text-neutral-950 hover:bg-neutral-100 hover:text-neutral-950`,
};
