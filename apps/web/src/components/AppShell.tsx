import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ScrollText,
  Receipt,
  BarChart3,
  Pill,
  FileDown,
  Landmark,
  FlaskConical,
  LogOut,
  Wifi,
  WifiOff,
  Banknote,
  ChevronDown,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import logo from "@/assets/jamilapharm-logo.jpg";
import { getUser, signOut, type AuthUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/bordereaux", label: "Bordereaux", icon: ScrollText },
  { to: "/factures", label: "Factures", icon: Receipt },
  { to: "/statistiques", label: "Statistiques", icon: BarChart3 },
  { to: "/medicaments", label: "Médicaments", icon: Pill },
  { to: "/tresorerie", label: "Trésorerie", icon: Landmark },
  { to: "/creances", label: "Créances", icon: Banknote },
  { to: "/analyse", label: "Analyse", icon: FlaskConical },
  { to: "/exports", label: "Exports PDF", icon: FileDown },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [online, setOnline] = useState(true);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      navigate("/login");
      return;
    }
    setUser(u);
    const t = setInterval(() => setOnline(navigator.onLine), 5000);
    setOnline(navigator.onLine);
    return () => clearInterval(t);
  }, [navigate]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar">
        {/* Logo block */}
        <div className="flex items-center h-25 gap-3 px-5 py-5 border-b border-sidebar-border">
          <img src={logo} alt="JamilaPharm" className="w-17 h-17 align-center rounded-lg object-cover shadow-sm" />
          <div>
            <div className="font-bold text-sidebar-foreground leading-tight">JamilaPharm</div>
            <div className="text-xs text-muted-foreground">Supervision pharmacie</div>
        </div>
          </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = location.startsWith(to);
            return (
              <Link
                key={to}
                href={to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[var(--shadow-soft)]"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User block + logout */}
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-sidebar-accent/50">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-sidebar-foreground truncate">{user.name}</div>
              <div className="text-[10px] text-muted-foreground truncate capitalize">{user.role}</div>
            </div>
          </div>
          <button
            onClick={() => { signOut(); navigate("/login"); }}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-card/60 backdrop-blur sticky top-0 z-20">
          {/* Pharmacy info */}
          <div className="flex items-center gap-3 min-w-0">
            <img src={logo} alt="logo" className="w-8 h-8 rounded-md object-cover md:hidden" />
            <div className="min-w-0">
              <div className="text-[11px] text-muted-foreground leading-tight truncate hidden sm:block">{user.pharmacie}</div>
              <div className="font-semibold text-sm leading-tight truncate">{user.name}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* DB status */}
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium",
                online
                  ? "bg-success/15 text-success"
                  : "bg-destructive/15 text-destructive",
              )}
            >
              {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span className="hidden sm:inline">{online ? "Base de données connectée" : "Déconnectée"}</span>
            </div>

            {/* User dropdown */}
            <div className="relative" ref={dropRef}>
              <button
                onClick={() => setDropOpen((o) => !o)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-border bg-background hover:bg-muted transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                  {initials}
                </div>
                <span className="text-xs font-medium hidden sm:inline max-w-[120px] truncate">{user.name}</span>
                <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", dropOpen && "rotate-180")} />
              </button>

              {dropOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-card shadow-[var(--shadow-elevated)] z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2.5">
                      <img src={logo} alt="logo" className="w-9 h-9 rounded-lg object-cover" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{user.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-1.5">
                    <button
                      onClick={() => { setDropOpen(false); navigate("/exports"); }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
                    >
                      <FileDown className="w-4 h-4 text-muted-foreground" />
                      Exports PDF
                    </button>
                    <button
                      onClick={() => { signOut(); navigate("/login"); setDropOpen(false); }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-sidebar border-t border-sidebar-border flex justify-around py-2">
          {nav.slice(0, 5).map(({ to, label, icon: Icon }) => {
            const active = location.startsWith(to);
            return (
              <Link
                key={to}
                href={to}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="w-5 h-5" />
                {label.split(" ")[0]}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 p-6 pb-24 md:pb-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
