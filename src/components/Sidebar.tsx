import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  DollarSign,
  Wrench,
  FolderOpen,
  Users,
  TrendingUp,
  Building2,
} from "lucide-react";
import { clsx } from "clsx";

const nav = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/financial", icon: DollarSign, label: "Financial" },
  { to: "/operations", icon: Wrench, label: "Operations" },
  { to: "/assets", icon: FolderOpen, label: "Asset Mgmt" },
  { to: "/tenant", icon: Users, label: "Tenant Portal" },
  { to: "/investor", icon: TrendingUp, label: "Investor Portal" },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-primary-900 text-white flex flex-col min-h-screen flex-shrink-0">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-primary-700">
        <Building2 className="w-7 h-7 text-primary-100" />
        <div>
          <p className="font-bold text-sm leading-tight">PropManage</p>
          <p className="text-xs text-primary-300">CRE Platform</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary-700 text-white"
                  : "text-primary-200 hover:bg-primary-800 hover:text-white"
              )
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-6 py-4 border-t border-primary-700">
        <p className="text-xs text-primary-400">© 2025 PropManage</p>
      </div>
    </aside>
  );
}
