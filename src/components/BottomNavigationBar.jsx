import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, QrCode, Settings } from "lucide-react";

const tabs = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/clients", label: "Clientes", icon: Users },
  { path: "/scanner", label: "Scanner", icon: QrCode },
  { path: "/settings", label: "Ajustes", icon: Settings },
];

export default function BottomNavigationBar() {
  const location = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex items-center justify-around"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {tabs.map(tab => {
        const active = location.pathname === tab.path;
        return (
          <Link key={tab.path} to={tab.path}
            className={`flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] font-medium transition-colors ${
              active ? "text-primary" : "text-muted-foreground"
            }`}>
            <tab.icon className={`w-5 h-5 ${active ? "text-primary" : ""}`} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}