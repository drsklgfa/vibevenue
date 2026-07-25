"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AdminIdentity,
  AdminSessionInfo,
  OrganizationStatus,
  PlanCode,
  PlatformClientSummary,
  PlatformInvoice,
  PlatformOverview
} from "@vibevenue/contracts";
import { Building2, Copy, LayoutDashboard, LogOut, Plus, RefreshCw, ShieldCheck, Ticket, Users, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "@/lib/api";
import { Badge, Button, Card, Empty, Field, Metric, Select, Textarea } from "./ui";

type Tab = "overview" | "clients" | "invoices" | "security";
type Secret = { title: string; email: string; password: string; detail: string };

const planDefaults: Record<PlanCode, { maxVenues: number; maxUsers: number; maxZonesPerVenue: number }> = {
  demo: { maxVenues: 1, maxUsers: 3, maxZonesPerVenue: 20 },
  start: { maxVenues: 1, maxUsers: 5, maxZonesPerVenue: 50 },
  pro: { maxVenues: 5, maxUsers: 25, maxZonesPerVenue: 250 },
  network: { maxVenues: 50, maxUsers: 250, maxZonesPerVenue: 1000 },
  custom: { maxVenues: 1000, maxUsers: 10000, maxZonesPerVenue: 10000 }
};
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const statusTone = (status: string): "purple" | "cyan" | "green" | "amber" | "red" => {
  if (["active", "paid"].includes(status)) return "green";
  if (status === "trial") return "cyan";
  if (["past_due", "open"].includes(status)) return "amber";
  if (["cancelled", "overdue"].includes(status)) return "red";
  return "purple";
};
const todayPlus = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

export function PlatformConsole({ identity, onLogout, onError, onSuccess }: {
  identity: AdminIdentity;
  onLogout: () => void;
  onError: (value: string) => void;
  onSuccess: (value: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [clients, setClients] = useState<PlatformClientSummary[]>([]);
  const [invoices, setInvoices] = useState<PlatformInvoice[]>([]);
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState<Secret | null>(null);
  const [menu, setMenu] = useState(false);
  const [loadError, setLoadError] = useState("");

  const refresh = useCallback(async () => {
    setLoadError("");
    try {
      const [overviewResult, clientsResult, invoicesResult] = await Promise.all([
        api.platformOverview(), api.platformClients(), api.platformInvoices()
      ]);
      setOverview(overviewResult.overview);
      setClients(clientsResult.clients);
      setInvoices(invoicesResult.invoices);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao carregar a plataforma";
      setLoadError(message);
      throw error;
    }
  }, []);
  useEffect(() => { void refresh().catch(() => undefined); }, [refresh]);
  const act = async (fn: () => Promise<void>, success: string) => {
    setBusy(true);
    try { await fn(); await refresh(); onSuccess(success); }
    catch (error) { onError(error instanceof Error ? error.message : "Ação não concluída"); }
    finally { setBusy(false); }
  };
  const logout = () => { void api.logout().finally(onLogout); };
  const selectTab = (next: Tab) => { setTab(next); setMenu(false); };
  if (!overview) return <main className="loading-page"><span className="logo-mark large">V</span><p>{loadError || "Carregando administração da plataforma..."}</p>{loadError && <Button onClick={() => void refresh().catch((error) => onError(error instanceof Error ? error.message : "Falha ao carregar a plataforma"))}>Tentar novamente</Button>}</main>;

  const title = tab === "overview" ? "Visão geral" : tab === "clients" ? "Clientes" : tab === "invoices" ? "Faturas" : "Segurança";
  return <main className="admin-layout">
    <aside className={menu ? "sidebar open" : "sidebar"}>
      <div className="sidebar-brand"><span className="logo-mark">V</span><div><strong>VibeVenue</strong><small>PLATFORM</small></div><button className="mobile-close" onClick={() => setMenu(false)}><X/></button></div>
      <nav>
        <button className={tab === "overview" ? "active" : ""} onClick={() => selectTab("overview")}><LayoutDashboard size={19}/><span>Visão geral</span></button>
        <button className={tab === "clients" ? "active" : ""} onClick={() => selectTab("clients")}><Building2 size={19}/><span>Clientes</span></button>
        <button className={tab === "invoices" ? "active" : ""} onClick={() => selectTab("invoices")}><Ticket size={19}/><span>Faturas</span></button>
        <button className={tab === "security" ? "active" : ""} onClick={() => selectTab("security")}><ShieldCheck size={19}/><span>Segurança</span></button>
      </nav>
      <div className="sidebar-user"><div className="user-avatar">{identity.name.slice(0, 1)}</div><div><strong>{identity.name}</strong><small>administrador da plataforma</small></div><button onClick={logout} aria-label="Sair"><LogOut/></button></div>
    </aside>
    <section className="admin-main">
      <header className="admin-top"><button className="mobile-menu" onClick={() => setMenu(true)}>☰</button><div><span className="eyebrow">OPERAÇÃO COMERCIAL</span><h1>{title}</h1></div><div className="top-actions"><span className="live-pill"><i/> Console protegido</span><Button variant="ghost" onClick={() => void refresh().catch((error) => onError(error instanceof Error ? error.message : "Falha ao atualizar"))}><RefreshCw size={17}/> Atualizar</Button></div></header>
      <div className="admin-content stack-lg">
        {secret && <Card title={secret.title} action={<Button variant="ghost" onClick={() => setSecret(null)}>Ocultar</Button>}><div className="credential-box"><ShieldCheck/><div><strong>{secret.email}</strong><code>{secret.password}</code><small>{secret.detail}</small></div></div></Card>}
        {tab === "overview" && <PlatformOverviewView overview={overview} clients={clients} invoices={invoices}/>} 
        {tab === "clients" && <ClientsView clients={clients} busy={busy} act={act} onSecret={setSecret}/>} 
        {tab === "invoices" && <InvoicesView clients={clients} invoices={invoices} busy={busy} act={act}/>} 
        {tab === "security" && <PlatformSecurity busy={busy} onError={onError} onSuccess={onSuccess}/>} 
      </div>
    </section>
  </main>;
}

function PlatformOverviewView({ overview, clients, invoices }: { overview: PlatformOverview; clients: PlatformClientSummary[]; invoices: PlatformInvoice[] }) {
  const recent = clients.slice(0, 6);
  const overdue = invoices.filter((invoice) => invoice.status === "overdue").slice(0, 6);
  return <>
    <section className="metric-grid"><Metric label="Clientes" value={overview.organizations.total} detail={`${overview.organizations.active} ativos e ${overview.organizations.trial} em teste`}/><Metric label="MRR cadastrado" value={money(overview.monthlyRecurringRevenueCents)} detail="mensalidades de contas operacionais"/><Metric label="Faturas vencidas" value={overview.invoices.overdue} detail={`${overview.invoices.open} ainda abertas`}/><Metric label="Recebido em 30 dias" value={money(overview.invoices.paidLast30DaysCents)} detail="baixas registradas no sistema"/></section>
    <div className="admin-grid"><Card title="Situação da base"><div className="operation-list"><StatusMetric label="Ativos" value={overview.organizations.active} tone="green"/><StatusMetric label="Em teste" value={overview.organizations.trial} tone="cyan"/><StatusMetric label="Inadimplentes" value={overview.organizations.pastDue} tone="amber"/><StatusMetric label="Suspensos/cancelados" value={overview.organizations.suspended + overview.organizations.cancelled} tone="red"/></div></Card><Card title="Clientes recentes">{recent.length ? recent.map((client) => <div className="compact-row" key={client.id}><Building2/><div><strong>{client.name}</strong><small>{client.owner?.email ?? client.billingEmail} • {client.plan}</small></div><Badge tone={statusTone(client.status)}>{client.status}</Badge></div>) : <Empty>Nenhum cliente cadastrado.</Empty>}</Card></div>
    <Card title="Cobranças vencidas">{overdue.length ? overdue.map((invoice) => <div className="compact-row" key={invoice.id}><Ticket/><div><strong>{invoice.organizationName} — {invoice.reference}</strong><small>Venceu em {new Date(invoice.dueAt).toLocaleDateString("pt-BR")}</small></div><Badge tone="red">{money(invoice.amountCents)}</Badge></div>) : <Empty>Nenhuma cobrança vencida.</Empty>}</Card>
  </>;
}
function StatusMetric({ label, value, tone }: { label: string; value: number; tone: string }) { return <div className={`operation ${tone}`}><span><Users/></span><div><strong>{label}</strong><small>{value} empresa(s)</small></div></div>; }

function ClientsView({ clients, busy, act, onSecret }: { clients: PlatformClientSummary[]; busy: boolean; act: (fn: () => Promise<void>, success: string) => Promise<void>; onSecret: (secret: Secret) => void }) {
  return <><ClientCreate busy={busy} act={act} onSecret={onSecret}/><Card title={`Empresas cadastradas (${clients.length})`}><div className="platform-client-list">{clients.length ? clients.map((client) => <ClientRow key={client.id} client={client} busy={busy} act={act} onSecret={onSecret}/>) : <Empty>Nenhuma empresa cadastrada.</Empty>}</div></Card></>;
}
function ClientCreate({ busy, act, onSecret }: { busy: boolean; act: (fn: () => Promise<void>, success: string) => Promise<void>; onSecret: (secret: Secret) => void }) {
  const [value, setValue] = useState({ company: "", ownerName: "", ownerEmail: "", billingEmail: "", venueName: "", city: "", description: "", plan: "start" as PlanCode, monthlyReais: "299", trialDays: 14, maxVenues: "", maxUsers: "", maxZones: "", requireGuestConsent: false, privacyPolicyUrl: "", termsUrl: "", privacyVersion: "1.0", termsVersion: "1.0" });
  const submit = () => act(async () => {
    const result = await api.platformCreateClient({ company: value.company, ownerName: value.ownerName, ownerEmail: value.ownerEmail, billingEmail: value.billingEmail || value.ownerEmail, venueName: value.venueName, city: value.city, description: value.description, plan: value.plan, monthlyPriceCents: Math.max(0, Math.round(Number(value.monthlyReais.replace(",", ".")) * 100)), trialDays: value.trialDays, maxVenues: value.maxVenues ? Number(value.maxVenues) : null, maxUsers: value.maxUsers ? Number(value.maxUsers) : null, maxZonesPerVenue: value.maxZones ? Number(value.maxZones) : null, requireGuestConsent: value.requireGuestConsent, privacyPolicyUrl: value.privacyPolicyUrl, termsUrl: value.termsUrl, privacyVersion: value.privacyVersion, termsVersion: value.termsVersion });
    onSecret({ title: "Cliente criado — copie a senha agora", email: value.ownerEmail, password: result.temporaryPassword, detail: `Portal: ?venue=${result.venueSlug}&zone=${result.zoneCode}. O proprietário deverá trocar a senha no primeiro acesso.` });
    setValue({ company: "", ownerName: "", ownerEmail: "", billingEmail: "", venueName: "", city: "", description: "", plan: "start", monthlyReais: "299", trialDays: 14, maxVenues: "", maxUsers: "", maxZones: "", requireGuestConsent: false, privacyPolicyUrl: "", termsUrl: "", privacyVersion: "1.0", termsVersion: "1.0" });
  }, "Cliente criado e acesso temporário gerado.");
  return <Card title="Cadastrar novo cliente"><div className="platform-form-grid"><Field placeholder="Empresa" value={value.company} onChange={(event) => setValue({ ...value, company: event.target.value })}/><Field placeholder="Nome do proprietário" value={value.ownerName} onChange={(event) => setValue({ ...value, ownerName: event.target.value })}/><Field type="email" placeholder="E-mail do proprietário" value={value.ownerEmail} onChange={(event) => setValue({ ...value, ownerEmail: event.target.value })}/><Field type="email" placeholder="E-mail de cobrança (opcional)" value={value.billingEmail} onChange={(event) => setValue({ ...value, billingEmail: event.target.value })}/><Field placeholder="Primeiro estabelecimento" value={value.venueName} onChange={(event) => setValue({ ...value, venueName: event.target.value })}/><Field placeholder="Cidade/UF" value={value.city} onChange={(event) => setValue({ ...value, city: event.target.value })}/><Select value={value.plan} onChange={(event) => setValue({ ...value, plan: event.target.value as PlanCode })}><option value="demo">Demo</option><option value="start">Start</option><option value="pro">Pro</option><option value="network">Network</option><option value="custom">Custom</option></Select><Field type="number" min="0" step="0.01" placeholder="Mensalidade em reais" value={value.monthlyReais} onChange={(event) => setValue({ ...value, monthlyReais: event.target.value })}/><Field type="number" min="0" placeholder="Dias de teste" value={value.trialDays} onChange={(event) => setValue({ ...value, trialDays: Number(event.target.value) })}/><Field type="number" min="1" placeholder="Limite de unidades (opcional)" value={value.maxVenues} onChange={(event) => setValue({ ...value, maxVenues: event.target.value })}/><Field type="number" min="1" placeholder="Limite de usuários (opcional)" value={value.maxUsers} onChange={(event) => setValue({ ...value, maxUsers: event.target.value })}/><Field type="number" min="1" placeholder="Áreas por unidade (opcional)" value={value.maxZones} onChange={(event) => setValue({ ...value, maxZones: event.target.value })}/><Textarea className="span-two" placeholder="Descrição da primeira unidade" value={value.description} onChange={(event) => setValue({ ...value, description: event.target.value })}/><label className="check-line span-two"><input type="checkbox" checked={value.requireGuestConsent} onChange={(event) => setValue({ ...value, requireGuestConsent: event.target.checked })}/> Exigir aceite de política e termos no portal do visitante</label>{value.requireGuestConsent && <><Field placeholder="URL HTTPS da política" value={value.privacyPolicyUrl} onChange={(event) => setValue({ ...value, privacyPolicyUrl: event.target.value })}/><Field placeholder="URL HTTPS dos termos" value={value.termsUrl} onChange={(event) => setValue({ ...value, termsUrl: event.target.value })}/></>}</div><Button disabled={busy || value.company.length < 2 || value.ownerName.length < 2 || !value.ownerEmail.includes("@") || value.venueName.length < 2} onClick={() => void submit()}><Plus/> Criar cliente completo</Button></Card>;
}
function ClientRow({ client, busy, act, onSecret }: { client: PlatformClientSummary; busy: boolean; act: (fn: () => Promise<void>, success: string) => Promise<void>; onSecret: (secret: Secret) => void }) {
  const [status, setStatus] = useState<OrganizationStatus>(client.status);
  const [trialDays, setTrialDays] = useState(14);
  const [accessDays, setAccessDays] = useState(5);
  const [commercial, setCommercial] = useState({ name: client.name, plan: client.plan, billingEmail: client.billingEmail, monthlyReais: String(client.monthlyPriceCents / 100), maxVenues: client.limits.maxVenues, maxUsers: client.limits.maxUsers, maxZonesPerVenue: client.limits.maxZonesPerVenue });
  useEffect(() => { setStatus(client.status); setCommercial({ name: client.name, plan: client.plan, billingEmail: client.billingEmail, monthlyReais: String(client.monthlyPriceCents / 100), maxVenues: client.limits.maxVenues, maxUsers: client.limits.maxUsers, maxZonesPerVenue: client.limits.maxZonesPerVenue }); }, [client]);
  const reset = () => { if (!client.owner) return; return act(async () => { const result = await api.platformResetPassword(client.owner!.email); onSecret({ title: "Senha temporária redefinida", email: result.email, password: result.temporaryPassword, detail: "Todas as sessões anteriores foram encerradas e a troca da senha será obrigatória." }); }, "Senha temporária redefinida."); };
  const changePlan = (plan: PlanCode) => { const defaults = planDefaults[plan]!; setCommercial({ ...commercial, plan, maxVenues: defaults.maxVenues, maxUsers: defaults.maxUsers, maxZonesPerVenue: defaults.maxZonesPerVenue }); };
  return <div className="platform-client-card">
    <div className="platform-client-head"><div><strong>{client.name}</strong><small>{client.owner?.name ?? "Sem proprietário"} • {client.owner?.email ?? client.billingEmail}</small></div><Badge tone={statusTone(client.status)}>{client.status}</Badge></div>
    <div className="usage-grid"><span>Plano<strong>{client.plan}</strong></span><span>Mensalidade<strong>{money(client.monthlyPriceCents)}</strong></span><span>Uso<strong>{client.usage.venues}/{client.limits.maxVenues} unidades</strong></span><span>Equipe<strong>{client.usage.activeUsers}/{client.limits.maxUsers}</strong></span><span>Áreas<strong>{client.usage.zones}</strong></span><span>Criado<strong>{new Date(client.createdAt).toLocaleDateString("pt-BR")}</strong></span></div>
    <details className="platform-details"><summary>Plano, preço e limites</summary><div className="platform-form-grid"><Field value={commercial.name} onChange={(event) => setCommercial({ ...commercial, name: event.target.value })}/><Field type="email" value={commercial.billingEmail} onChange={(event) => setCommercial({ ...commercial, billingEmail: event.target.value })}/><Select value={commercial.plan} onChange={(event) => changePlan(event.target.value as PlanCode)}><option value="demo">Demo</option><option value="start">Start</option><option value="pro">Pro</option><option value="network">Network</option><option value="custom">Custom</option></Select><Field type="number" min="0" step="0.01" value={commercial.monthlyReais} onChange={(event) => setCommercial({ ...commercial, monthlyReais: event.target.value })}/><Field type="number" min="1" value={commercial.maxVenues} onChange={(event) => setCommercial({ ...commercial, maxVenues: Number(event.target.value) })}/><Field type="number" min="1" value={commercial.maxUsers} onChange={(event) => setCommercial({ ...commercial, maxUsers: Number(event.target.value) })}/><Field type="number" min="1" value={commercial.maxZonesPerVenue} onChange={(event) => setCommercial({ ...commercial, maxZonesPerVenue: Number(event.target.value) })}/></div><Button variant="secondary" disabled={busy || commercial.name.length < 2 || !commercial.billingEmail.includes("@")} onClick={() => void act(async () => { await api.platformClientCommercial(client.id, { name: commercial.name, plan: commercial.plan, billingEmail: commercial.billingEmail, monthlyPriceCents: Math.max(0, Math.round(Number(commercial.monthlyReais.replace(",", ".")) * 100)), maxVenues: commercial.maxVenues, maxUsers: commercial.maxUsers, maxZonesPerVenue: commercial.maxZonesPerVenue }); }, "Plano e condições comerciais atualizados.")}>Salvar condições comerciais</Button></details>
    <details className="platform-details"><summary>Acesso e situação</summary><div className="platform-actions"><Select value={status} onChange={(event) => setStatus(event.target.value as OrganizationStatus)}><option value="trial">Teste</option><option value="active">Ativo</option><option value="past_due">Inadimplente</option><option value="suspended">Suspenso</option><option value="cancelled">Cancelado</option></Select>{status === "trial" && <Field type="number" min="1" value={trialDays} onChange={(event) => setTrialDays(Number(event.target.value))}/>} {status === "past_due" && <Field type="number" min="0" value={accessDays} onChange={(event) => setAccessDays(Number(event.target.value))}/>}<Button variant="secondary" disabled={busy} onClick={() => void act(async () => { await api.platformClientStatus(client.id, { status, trialDays, accessDays }); }, "Situação comercial atualizada.")}>Salvar situação</Button><Button variant="ghost" disabled={busy || !client.owner} onClick={() => void reset()}>Redefinir senha do proprietário</Button></div></details>
  </div>;
}

function InvoicesView({ clients, invoices, busy, act }: { clients: PlatformClientSummary[]; invoices: PlatformInvoice[]; busy: boolean; act: (fn: () => Promise<void>, success: string) => Promise<void> }) {
  const [value, setValue] = useState({ organizationId: clients[0]?.id ?? "", reference: new Date().toISOString().slice(0, 7), amountReais: clients[0] ? String(clients[0].monthlyPriceCents / 100) : "0", dueAt: todayPlus(7), notes: "" });
  useEffect(() => { if (!value.organizationId && clients[0]) setValue((current) => ({ ...current, organizationId: clients[0]!.id, amountReais: String(clients[0]!.monthlyPriceCents / 100) })); }, [clients, value.organizationId]);
  const selected = useMemo(() => clients.find((client) => client.id === value.organizationId), [clients, value.organizationId]);
  const create = () => act(async () => { await api.platformCreateInvoice({ organizationId: value.organizationId, reference: value.reference, amountCents: Math.max(0, Math.round(Number(value.amountReais.replace(",", ".")) * 100)), dueAt: new Date(`${value.dueAt}T12:00:00`).toISOString(), periodStart: null, periodEnd: null, notes: value.notes }); setValue({ ...value, reference: new Date().toISOString().slice(0, 7), dueAt: todayPlus(7), notes: "" }); }, "Fatura criada.");
  return <><Card title="Emitir fatura"><div className="platform-form-grid"><Select value={value.organizationId} onChange={(event) => { const client = clients.find((item) => item.id === event.target.value); setValue({ ...value, organizationId: event.target.value, amountReais: client ? String(client.monthlyPriceCents / 100) : value.amountReais }); }}>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</Select><Field placeholder="Referência" value={value.reference} onChange={(event) => setValue({ ...value, reference: event.target.value })}/><Field type="number" min="0" step="0.01" value={value.amountReais} onChange={(event) => setValue({ ...value, amountReais: event.target.value })}/><Field type="date" value={value.dueAt} onChange={(event) => setValue({ ...value, dueAt: event.target.value })}/><Textarea className="span-two" placeholder="Observações" value={value.notes} onChange={(event) => setValue({ ...value, notes: event.target.value })}/></div><Button disabled={busy || !selected || !value.reference || !value.dueAt} onClick={() => void create()}><Plus/> Criar cobrança</Button></Card><Card title={`Faturas (${invoices.length})`}><div className="table-list">{invoices.length ? invoices.map((invoice) => <InvoiceRow key={invoice.id} invoice={invoice} busy={busy} act={act}/>) : <Empty>Nenhuma fatura emitida.</Empty>}</div></Card></>;
}
function InvoiceRow({ invoice, busy, act }: { invoice: PlatformInvoice; busy: boolean; act: (fn: () => Promise<void>, success: string) => Promise<void> }) {
  return <div className="invoice-row"><div><strong>{invoice.organizationName} — {invoice.reference}</strong><small>{money(invoice.amountCents)} • vencimento {new Date(invoice.dueAt).toLocaleDateString("pt-BR")}{invoice.paidAt ? ` • pago ${new Date(invoice.paidAt).toLocaleDateString("pt-BR")}` : ""}</small></div><Badge tone={statusTone(invoice.status)}>{invoice.status}</Badge>{["open", "overdue"].includes(invoice.status) && <div className="row-actions"><Button disabled={busy} onClick={() => void act(async () => { await api.platformSettleInvoice(invoice.id, { status: "paid", paymentMethod: "manual", externalReference: "", notes: "" }); }, "Pagamento registrado.")}>Marcar paga</Button><Button variant="danger" disabled={busy} onClick={() => void act(async () => { await api.platformSettleInvoice(invoice.id, { status: "void", paymentMethod: "", externalReference: "", notes: "Cancelada no painel" }); }, "Fatura cancelada.")}>Cancelar</Button></div>}</div>;
}

function PlatformSecurity({ busy, onError, onSuccess }: { busy: boolean; onError: (value: string) => void; onSuccess: (value: string) => void }) {
  const [sessions, setSessions] = useState<AdminSessionInfo[]>([]);
  const [password, setPassword] = useState({ current: "", next: "", confirm: "" });
  const [mfa, setMfa] = useState({ enabled: false, enrolledAt: null as string | null, recoveryCodesRemaining: 0, required: true });
  const [mfaUri, setMfaUri] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [stepUp, setStepUp] = useState({ password: "", code: "" });
  const load = useCallback(async () => {
    try { const [sessionResult,mfaResult]=await Promise.all([api.sessions(),api.mfaStatus()]); setSessions(sessionResult.sessions); setMfa(mfaResult.status); }
    catch(error){onError(error instanceof Error?error.message:"Falha ao carregar segurança");}
  }, [onError]);
  useEffect(() => { void load(); }, [load]);
  const change = async () => {
    if (password.next !== password.confirm) { onError("A confirmação da nova senha não confere."); return; }
    try { await api.changePassword(password.current, password.next); setPassword({ current: "", next: "", confirm: "" }); await load(); onSuccess("Senha alterada e outras sessões encerradas."); }
    catch (error) { onError(error instanceof Error ? error.message : "Não foi possível alterar a senha"); }
  };
  const setup=async()=>{try{const result=await api.setupMfa();setMfaUri(result.otpauthUri)}catch(error){onError(error instanceof Error?error.message:"Falha ao iniciar MFA")}};
  const verify=async()=>{try{const result=await api.verifyMfa(mfaCode);setRecoveryCodes(result.recoveryCodes??[]);setMfaUri("");setMfaCode("");await load();onSuccess("MFA ativado.")}catch(error){onError(error instanceof Error?error.message:"Código inválido")}};
  const confirm=async()=>{try{const result=await api.stepUp(stepUp.password,stepUp.code);setStepUp({password:"",code:""});onSuccess(`Identidade confirmada por ${result.validForMinutes} minutos.`)}catch(error){onError(error instanceof Error?error.message:"Falha na confirmação")}};
  return <div className="stack-lg"><div className="admin-grid"><Card title="MFA obrigatório"><div className="form-stack"><div className="compact-row"><ShieldCheck/><div><strong>{mfa.enabled?"Proteção ativa":"Ativação pendente"}</strong><small>{mfa.recoveryCodesRemaining} códigos de recuperação disponíveis</small></div><Badge tone={mfa.enabled?"green":"red"}>{mfa.enabled?"ativo":"obrigatório"}</Badge></div>{!mfa.enabled&&!mfaUri&&<Button onClick={()=>void setup()}>Ativar MFA</Button>}{mfaUri&&<><div style={{display:"flex",justifyContent:"center",padding:12,background:"white",borderRadius:14}}><QRCodeSVG value={mfaUri} size={180}/></div><Field value={mfaCode} onChange={event=>setMfaCode(event.target.value)} placeholder="Código de seis dígitos"/><Button disabled={mfaCode.length<6} onClick={()=>void verify()}>Confirmar ativação</Button></>}{recoveryCodes.length>0&&<><div className="recovery-codes">{recoveryCodes.map(code=><code key={code}>{code}</code>)}</div><Button variant="secondary" onClick={()=>void navigator.clipboard.writeText(recoveryCodes.join("\n")).then(()=>onSuccess("Códigos copiados."))}><Copy/> Copiar códigos</Button></>}</div></Card><Card title="Step-up para ações críticas"><div className="form-stack"><p className="muted">Confirme novamente antes de criar clientes, alterar planos, redefinir senhas ou movimentar faturas.</p><Field type="password" value={stepUp.password} onChange={event=>setStepUp({...stepUp,password:event.target.value})} placeholder="Senha atual"/><Field value={stepUp.code} onChange={event=>setStepUp({...stepUp,code:event.target.value})} placeholder="Código MFA"/><Button disabled={!mfa.enabled||!stepUp.password||stepUp.code.length<6} onClick={()=>void confirm()}><ShieldCheck/> Confirmar identidade</Button></div></Card></div><div className="admin-grid"><Card title="Alterar senha"><div className="form-stack"><Field type="password" placeholder="Senha atual" value={password.current} onChange={(event) => setPassword({ ...password, current: event.target.value })}/><Field type="password" placeholder="Nova senha forte" value={password.next} onChange={(event) => setPassword({ ...password, next: event.target.value })}/><Field type="password" placeholder="Confirme a nova senha" value={password.confirm} onChange={(event) => setPassword({ ...password, confirm: event.target.value })}/><Button disabled={busy || !password.current || password.next.length < 10 || password.confirm.length < 10} onClick={() => void change()}>Alterar senha</Button></div></Card><Card title="Dispositivos conectados" action={<Button variant="ghost" onClick={() => void api.revokeOtherSessions().then(() => { void load(); onSuccess("Outras sessões encerradas."); }).catch((error) => onError(error instanceof Error ? error.message : "Falha ao encerrar sessões"))}>Encerrar outras</Button>}>{sessions.length ? sessions.map((session) => <div className="compact-row" key={session.id}><ShieldCheck/><div><strong>{session.current ? "Sessão atual" : session.userAgent}</strong><small>Última atividade: {new Date(session.lastSeenAt).toLocaleString("pt-BR")}</small></div>{session.current ? <Badge tone="green">atual</Badge> : <Button variant="danger" onClick={() => void api.revokeSession(session.id).then(() => { void load(); onSuccess("Sessão encerrada."); }).catch((error) => onError(error instanceof Error ? error.message : "Falha ao encerrar sessão"))}>Encerrar</Button>}</div>) : <Empty>Nenhuma sessão ativa.</Empty>}</Card></div></div>;
}
