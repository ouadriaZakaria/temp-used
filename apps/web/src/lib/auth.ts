// Lightweight mock auth (no backend yet) — replace with Lovable Cloud later.
const KEY = "jamilapharm:user";

export interface AuthUser {
  email: string;
  name: string;
  pharmacie: string;
  role: "proprietaire" | "gestionnaire";
}

export const getUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
};

export const signIn = (email: string, _password: string): AuthUser => {
  const isAuto = email === "pharmacie@belfekroun.dz";
  const user: AuthUser = {
    email,
    name: isAuto ? "BELFEKROUN HADJAR" : email.split("@")[0].replace(/\./g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    pharmacie: "Pharmacie BELFEKROUN HADJAR — Sidi Bel Abbes",
    role: "proprietaire",
  };
  localStorage.setItem(KEY, JSON.stringify(user));
  return user;
};

export const signOut = () => {
  localStorage.removeItem(KEY);
};
