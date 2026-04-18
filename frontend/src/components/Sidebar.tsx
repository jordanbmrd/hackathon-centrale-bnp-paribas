import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Activity,
  type LucideIcon,
} from "lucide-react";

export type PageId = "dashboard" | "simulator" | "benchmark" | "market";

export interface SidebarItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: "dashboard",
    label: "Dossier",
    icon: LayoutDashboard,
    description: "Vue 360° du client",
  },
  {
    id: "simulator",
    label: "Simulateur",
    icon: TrendingUp,
    description: "Projection du patrimoine",
  },
  {
    id: "benchmark",
    label: "Benchmarks",
    icon: BarChart3,
    description: "Client vs pairs",
  },
  {
    id: "market",
    label: "Marché",
    icon: Activity,
    description: "Indices et supports",
  },
];

interface Props {
  active: PageId;
  onChange: (id: PageId) => void;
}

export default function Sidebar({ active, onChange }: Props) {
  return (
    <nav className="w-[72px] flex-shrink-0 bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-2 shadow-[4px_0_16px_-10px_rgba(15,23,42,0.08)]">
      {SIDEBAR_ITEMS.map((item) => {
        const isActive = item.id === active;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            title={item.description}
            onClick={() => onChange(item.id)}
            className={`group relative w-14 flex flex-col items-center gap-1 py-2 rounded-xl transition-all ${
              isActive
                ? "text-white shadow-md"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
            style={
              isActive
                ? {
                    background:
                      "linear-gradient(135deg, #009E60 0%, #14B8A6 100%)",
                  }
                : undefined
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-semibold tracking-wide">
              {item.label}
            </span>
            {isActive && (
              <span className="pointer-events-none absolute -right-[1px] top-1/2 -translate-y-1/2 w-1 h-8 rounded-l-full bg-[#009E60]" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
