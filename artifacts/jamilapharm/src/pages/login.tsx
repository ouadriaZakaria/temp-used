import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Lock, ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import logo from "@/assets/jamilapharm-logo.jpg";
import { getUser, signIn } from "@/lib/auth";
import { toast } from "sonner";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getUser()) navigate("/dashboard");
  }, [navigate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error("Veuillez entrer votre mot de passe");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      signIn("pharmacie@belfekroun.dz", password);
      toast.success("Bienvenue sur JamilaPharm !");
      navigate("/dashboard");
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Left panel — branding */}
      <div className="hidden md:flex md:w-5/12 flex-col items-center justify-center p-12 bg-gradient-to-br from-primary/90 to-primary relative overflow-hidden">
        {/* decorative circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-white/5" />

        <div className="relative z-10 text-center">
          <div className="w-28 h-28 rounded-3xl shadow-2xl overflow-hidden mx-auto mb-6 ring-4 ring-white/30">
            <img src={logo} alt="JamilaPharm" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">JamilaPharm</h1>
          <p className="text-white/75 text-base font-medium mb-1">Pharmacie BELFEKROUN HADJAR</p>
          <p className="text-white/55 text-sm">Sidi Bel Abbes — Algérie</p>

          <div className="mt-10 space-y-3 text-left">
            {[
              "Suivi en temps réel de vos créances CNAS",
              "Gestion des bordereaux et factures",
              "Exports PDF et rapports financiers",
              "Tableau de bord analytique complet",
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-2.5 text-white/80 text-sm">
                <ShieldCheck className="w-4 h-4 text-white/60 flex-shrink-0" />
                {feat}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-14">
        {/* Mobile logo */}
        <div className="md:hidden flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl shadow-xl overflow-hidden mb-4 ring-2 ring-primary/20">
            <img src={logo} alt="JamilaPharm" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold">JamilaPharm</h1>
          <p className="text-muted-foreground text-sm">Pharmacie BELFEKROUN HADJAR</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Connexion</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Accédez à votre espace de supervision pharmacie.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            {/* Email — pre-filled, read-only */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <div className="flex items-center w-full rounded-xl border border-input bg-muted/50 px-4 py-3 text-sm text-muted-foreground cursor-default select-none">
                pharmacie@belfekroun.dz
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">Mot de passe</label>
                <button type="button" className="text-xs text-primary hover:underline">
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full pl-11 pr-11 py-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold text-sm rounded-xl py-3.5 mt-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-primary/30"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Connexion en cours…
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              Accès réservé aux propriétaires et gestionnaires autorisés.
            </p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              JamilaPharm v2 · Pharmacie BELFEKROUN HADJAR · Sidi Bel Abbes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
