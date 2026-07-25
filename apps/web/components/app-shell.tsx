"use client";
import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "@/lib/api";
import { appHref, PORTFOLIO_MODE } from "@/lib/base-path";
import { AdminDashboard } from "./admin-dashboard";
import { AdminLogin } from "./admin-login";
import { GuestPortal } from "./guest-portal";
import { Landing } from "./landing";
import { PortfolioPreview } from "./portfolio-preview";
import { Toast } from "./ui";
import { TvMode } from "./tv-mode";

type ExperienceMode = "admin" | "guest" | "tv";
type Mode = "landing" | ExperienceMode | "portfolio";
type AdminState = "checking" | "authenticated" | "anonymous";

export function AppShell() {
  const [mode, setMode] = useState<Mode>("landing");
  const [preview, setPreview] = useState<ExperienceMode>("admin");
  const [adminState, setAdminState] = useState<AdminState>("checking");
  const [venue, setVenue] = useState("espaco-aurora");
  const [zone, setZone] = useState("SALAO");
  const [toast, setToast] = useState<{ message: string; success: boolean } | null>(null);
  const error = useCallback((message: string) => setToast({ message, success: false }), []);
  const success = useCallback((message: string) => setToast({ message, success: true }), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const previewParam = params.get("preview");
    if (PORTFOLIO_MODE && ["admin", "guest", "tv"].includes(previewParam ?? "")) {
      setPreview(previewParam as ExperienceMode);
      setMode("portfolio");
      return;
    }
    const tv = params.get("tv"), venueParam = params.get("venue"), zoneParam = params.get("zone");
    if (tv) { setVenue(tv); setMode("tv"); }
    else if (venueParam) { setVenue(venueParam); setZone(zoneParam ?? "SALAO"); setMode("guest"); }
    else if (params.get("admin") === "1") setMode("admin");
  }, []);

  useEffect(() => {
    if (mode !== "admin" || adminState !== "checking") return;
    void api.adminMe().then(() => setAdminState("authenticated")).catch((reason) => {
      if (!(reason instanceof ApiError && reason.status === 401)) error(reason instanceof Error ? reason.message : "Falha ao verificar a sessão");
      setAdminState("anonymous");
    });
  }, [mode, adminState, error]);

  const navigate = (next: "landing" | ExperienceMode) => {
    if (next === "landing") {
      setMode("landing");
      history.pushState({}, "", appHref("/"));
      return;
    }
    if (PORTFOLIO_MODE) {
      setPreview(next);
      setMode("portfolio");
      history.pushState({}, "", `${appHref("/")}?preview=${next}`);
      return;
    }
    if (next === "admin") setAdminState("checking");
    setMode(next);
    const url = next === "admin" ? `${appHref("/")}?admin=1` : next === "tv" ? `${appHref("/")}?tv=${venue}` : `${appHref("/")}?venue=${venue}&zone=${zone}`;
    history.pushState({}, "", url);
  };

  const loggedOut = () => { setAdminState("anonymous"); navigate("landing"); };
  return <>
    {mode === "landing" && <Landing onAdmin={() => navigate("admin")} onGuest={() => navigate("guest")} onTv={() => navigate("tv")}/>} 
    {mode === "portfolio" && <PortfolioPreview initialView={preview} onBack={() => navigate("landing")}/>} 
    {mode === "admin" && (adminState === "checking" ? <main className="loading-page"><span className="logo-mark large">V</span><p>Verificando sua sessão...</p></main> : adminState === "authenticated" ? <AdminDashboard onLogout={loggedOut} onError={error} onSuccess={success}/> : <AdminLogin onBack={() => navigate("landing")} onAuthenticated={() => setAdminState("authenticated")} onError={error}/>)}
    {mode === "guest" && <GuestPortal initialSlug={venue} initialZone={zone} onBack={() => navigate("landing")} onError={error} onSuccess={success}/>} 
    {mode === "tv" && <TvMode slug={venue} onExit={() => navigate("landing")} onError={error}/>} 
    {toast && <Toast message={toast.message} success={toast.success} onClose={() => setToast(null)}/>} 
  </>;
}
