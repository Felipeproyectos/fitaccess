import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, CreditCard, Dumbbell, QrCode, Activity, Settings, Menu, X, Monitor, ChevronLeft, LogOut } from "lucide-react";
import { useState } from "react";
import BottomNavigationBar from "@/components/BottomNavigationBar";

const nav = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/clients", label: "Clientes", icon: Users },
  { path: "/memberships", label: "Membresías", icon: Dumbbell },
  { path: "/payments", label: "Pagos", icon: CreditCard },
{ path: "/scanner", label: "Validar QR", icon: QrCode },
  { path: "/attendance", label: "Asistencias", icon: Activity },
  { path: "/settings", label: "Configuración", icon: Settings },
  ];

function MobileHeader({ onMenuOpen }) {
    const location = useLocation();
    const navigate = useNavigate();
    const isRoot = location.pathname === "/";

  return (
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card"
                style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          {isRoot ? (
                          <button onClick={onMenuOpen} className="text-muted-foreground hover:text-white">
                                    <Menu className="w-5 h-5" />
                          </button>
                        ) : (
                          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-white">
                                    <ChevronLeft className="w-5 h-5" />
                          </button>
              )}
              <span className="font-display text-lg text-gradient tracking-wider">FITACCESS</span>
          {!isRoot && (
                          <button onClick={onMenuOpen} className="ml-auto text-muted-foreground hover:text-white">
                                    <Menu className="w-5 h-5" />
                          </button>
              )}
        </div>
      );
}

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
  
    const handleLogout = () => {
          window.location.href = "/logout";
    };
  
    const NavLinks = () => (
          <>
                <div className="p-6 border-b border-border">
                        <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF3B3B] to-[#FF7A00] flex items-center justify-center glow-red">
                                              <Dumbbell className="w-5 h-5 text-white" />
                                  </div>
                                  <div>
                                              <h1 className="font-display text-xl text-gradient tracking-wider">FITACCESS</h1>
                                              <p className="text-xs text-muted-foreground">Control de acceso</p>
                                  </div>
                        </div>
                </div>
                <nav className="p-4 space-y-1 flex-1">
                  {nav.map(item => {
                      const active = location.pathname === item.path;
                      return (
                                    <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                                                      active
                                                                        ? "bg-primary/20 text-white border border-primary/30"
                                                                        : "text-muted-foreground hover:text-white hover:bg-white/5"
                                                    }`}>
                                                  <item.icon className={`w-4 h-4 ${active ? "text-primary" : ""}`} />
                                      {item.label}
                                      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                                    </Link>
                                  );
          })}
                </nav>
                <div className="p-4 border-t border-border space-y-1">
                        <Link to="/public-screen" target="_blank"
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/5 transition-all">
                                  <Monitor className="w-4 h-4" />
                                  Pantalla Pública
                        </Link>
                        <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-white hover:bg-red-500/20 transition-all">
                                  <LogOut className="w-4 h-4" />
                                  Cerrar Sesión
                        </button>
                        <div className="flex flex-col items-center gap-1 px-3 py-3">
                                  <img src="https://media.base44.com/images/public/69cb2c19dffb908a425f36e6/a580270ca_LogominimalistadeByteSurenblancoynegro.png" alt="ByteSur" className="w-16 h-16 object-contain invert opacity-90" />
                                  <div className="text-center">
                                              <p className="text-[10px] text-muted-foreground leading-tight">Sistema creado por</p>
                                              <p className="text-xs font-bold text-white leading-tight">BYTE SUR</p>
                                              <p className="text-[10px] text-muted-foreground leading-tight">Soluciones Tecnológicas</p>
                                  </div>
                        </div>
                </div>
          </>>
        );
  
    return (
          <div className="flex h-screen bg-background overflow-hidden">
            {/* Desktop sidebar */}
                <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border shrink-0">
                        <NavLinks />
                </aside>
          
            {/* Mobile sidebar */}
            {sidebarOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden">
                              <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
                              <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col">
                                          <NavLinks />
                              </aside>
                    </div>
                )}
          
            {/* Main content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Mobile header */}
                        <MobileHeader onMenuOpen={() => setSidebarOpen(true)} />
                        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0" style={{ overscrollBehavior: 'none' }}>
                                  <Outlet />
                        </main>
                        <BottomNavigationBar />
                </div>
          </div>
        );
}
