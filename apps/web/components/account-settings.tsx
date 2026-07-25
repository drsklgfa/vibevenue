"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminIdentity, AdminNotification, AdminSessionInfo, AuditLogEntry, BillingInvoice, OrganizationAccess, Role, SecurityEventEntry, TeamMember } from "@vibevenue/contracts";
import { Bell, Copy, MonitorPlay, KeyRound, ShieldCheck, UserPlus, Users } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "@/lib/api";
import { Badge, Button, Card, Field, Select } from "./ui";

const roleLabels: Record<Role, string> = {
  owner: "Proprietário", manager: "Gerente", operator: "Operação", moderator: "Moderação", marketing: "Marketing", viewer: "Consulta"
};
const allRoles: Role[] = ["owner", "manager", "operator", "moderator", "marketing", "viewer"];

export function PasswordChangeGate({ identity, onError, onSuccess, onChanged, onLogout }: {
  identity: AdminIdentity;
  onError: (value: string) => void;
  onSuccess: (value: string) => void;
  onChanged: () => void;
  onLogout: () => void;
}) {
  const [password, setPassword] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (password.next !== password.confirm) { onError("A confirmação da nova senha não confere."); return; }
    setBusy(true);
    try {
      await api.changePassword(password.current, password.next);
      onSuccess("Senha definitiva criada. Seu painel foi liberado.");
      onChanged();
    } catch (error) { onError(error instanceof Error ? error.message : "Não foi possível alterar a senha"); }
    finally { setBusy(false); }
  };
  return <main className="loading-page password-gate"><Card title="Crie sua senha definitiva">
    <div className="form-stack">
      <div className="settings-callout"><KeyRound/><div><strong>Olá, {identity.name}</strong><p>Por segurança, a senha temporária só libera esta tela. Defina uma nova senha para acessar os dados da empresa.</p></div></div>
      <Field type="password" value={password.current} onChange={(event)=>setPassword({...password,current:event.target.value})} placeholder="Senha temporária atual" autoComplete="current-password"/>
      <Field type="password" value={password.next} onChange={(event)=>setPassword({...password,next:event.target.value})} placeholder="Nova senha forte" autoComplete="new-password"/>
      <Field type="password" value={password.confirm} onChange={(event)=>setPassword({...password,confirm:event.target.value})} placeholder="Confirmar nova senha" autoComplete="new-password"/>
      <p className="muted">Use ao menos 10 caracteres, com letra maiúscula, minúscula e número.</p>
      <Button disabled={busy||password.current.length<1||password.next.length<10||password.confirm.length<10} onClick={()=>void submit()}><ShieldCheck/> Liberar meu acesso</Button>
      <Button variant="ghost" disabled={busy} onClick={onLogout}>Sair e usar outra conta</Button>
    </div>
  </Card></main>;
}

export function AccountSettings({ identity, organization, onOrganizationChanged, onError, onSuccess }: {
  identity: AdminIdentity;
  organization: OrganizationAccess | null;
  onOrganizationChanged: (value: OrganizationAccess) => void;
  onError: (value: string) => void;
  onSuccess: (value: string) => void;
}) {
  const canManageTeam = ["owner", "manager"].includes(identity.role);
  const canViewBilling = ["owner", "manager", "viewer"].includes(identity.role);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [sessions, setSessions] = useState<AdminSessionInfo[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEventEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [member, setMember] = useState<{ name: string; email: string; password: string; role: Role }>({ name: "", email: "", password: "", role: "operator" });
  const [password, setPassword] = useState({ current: "", next: "", confirm: "" });
  const [mfaStatus, setMfaStatus] = useState({ enabled: identity.mfaEnabled, enrolledAt: null as string | null, recoveryCodesRemaining: 0, required: identity.isPlatformAdmin || identity.role === "owner" });
  const [mfaUri, setMfaUri] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [stepUp, setStepUp] = useState({ password: "", code: "" });
  const [settings, setSettings] = useState({
    name: organization?.name ?? "",
    billingEmail: organization?.billingEmail ?? "",
    requireGuestConsent: organization?.legal.requireConsent ?? false,
    privacyPolicyUrl: organization?.legal.privacyPolicyUrl ?? "",
    termsUrl: organization?.legal.termsUrl ?? "",
    privacyVersion: organization?.legal.privacyVersion ?? "1.0",
    termsVersion: organization?.legal.termsVersion ?? "1.0"
  });
  useEffect(() => {
    if (!organization) return;
    setSettings({
      name: organization.name, billingEmail: organization.billingEmail, requireGuestConsent: organization.legal.requireConsent,
      privacyPolicyUrl: organization.legal.privacyPolicyUrl, termsUrl: organization.legal.termsUrl,
      privacyVersion: organization.legal.privacyVersion, termsVersion: organization.legal.termsVersion
    });
  }, [organization]);
  const availableRoles = useMemo(() => identity.role === "owner" ? allRoles : allRoles.filter((role) => !["owner", "manager"].includes(role)), [identity.role]);
  const loadTeam = useCallback(async () => {
    if (!canManageTeam) return;
    try { setMembers((await api.team()).members); }
    catch (error) { onError(error instanceof Error ? error.message : "Falha ao carregar equipe"); }
  }, [canManageTeam, onError]);
  const loadSessions = useCallback(async () => {
    try { setSessions((await api.sessions()).sessions); }
    catch (error) { onError(error instanceof Error ? error.message : "Falha ao carregar sessões"); }
  }, [onError]);
  const loadBilling = useCallback(async () => {
    if (!canViewBilling) return;
    try { setInvoices((await api.billing()).invoices); }
    catch (error) { onError(error instanceof Error ? error.message : "Falha ao carregar cobranças"); }
  }, [canViewBilling, onError]);
  const loadAudit = useCallback(async () => {
    if (!canManageTeam) return;
    try { setAuditLogs((await api.audit()).items); }
    catch (error) { onError(error instanceof Error ? error.message : "Falha ao carregar auditoria"); }
  }, [canManageTeam, onError]);
  const loadNotifications = useCallback(async () => {
    try { setNotifications((await api.notifications()).items); }
    catch (error) { onError(error instanceof Error ? error.message : "Falha ao carregar avisos"); }
  }, [onError]);
  const loadSecurityEvents = useCallback(async () => {
    try { setSecurityEvents((await api.securityEvents()).items); }
    catch (error) { onError(error instanceof Error ? error.message : "Falha ao carregar eventos de segurança"); }
  }, [onError]);
  const loadMfa = useCallback(async () => {
    try { setMfaStatus((await api.mfaStatus()).status); }
    catch (error) { onError(error instanceof Error ? error.message : "Falha ao carregar segurança da conta"); }
  }, [onError]);
  useEffect(() => { void Promise.all([loadTeam(), loadSessions(), loadBilling(), loadAudit(), loadNotifications(), loadSecurityEvents(), loadMfa()]); }, [loadTeam, loadSessions, loadBilling, loadAudit, loadNotifications, loadSecurityEvents, loadMfa]);

  const beginMfa = async () => { setBusy(true); try { const result=await api.setupMfa(); setMfaUri(result.otpauthUri); setMfaCode(""); } catch(error){onError(error instanceof Error?error.message:"Não foi possível iniciar o MFA")} finally{setBusy(false)} };
  const verifyMfa = async () => { setBusy(true); try { const result=await api.verifyMfa(mfaCode); setRecoveryCodes(result.recoveryCodes??[]); setMfaUri(""); setMfaCode(""); await loadMfa(); onSuccess("Autenticação em duas etapas ativada."); } catch(error){onError(error instanceof Error?error.message:"Código MFA inválido")} finally{setBusy(false)} };
  const confirmStepUp = async () => { setBusy(true); try { const result=await api.stepUp(stepUp.password,stepUp.code); setStepUp({password:"",code:""}); onSuccess(`Identidade confirmada por ${result.validForMinutes} minutos.`); } catch(error){onError(error instanceof Error?error.message:"Não foi possível confirmar a identidade")} finally{setBusy(false)} };
  const turnOffMfa = async () => { setBusy(true); try { await api.disableMfa(); await loadMfa(); onSuccess("MFA desativado."); } catch(error){onError(error instanceof Error?error.message:"Não foi possível desativar o MFA")} finally{setBusy(false)} };
  const copyRecovery = async () => { await navigator.clipboard.writeText(recoveryCodes.join("\n")); onSuccess("Códigos copiados. Guarde-os em local seguro."); };

  const createMember = async () => {
    setBusy(true);
    try {
      await api.createTeamMember(member);
      await loadTeam();
      setMember({ name: "", email: "", password: "", role: "operator" });
      onSuccess("Usuário criado. Oriente a troca da senha no primeiro acesso.");
    } catch (error) { onError(error instanceof Error ? error.message : "Não foi possível criar o usuário"); }
    finally { setBusy(false); }
  };
  const updateMember = async (target: TeamMember, changes: Partial<Pick<TeamMember, "name" | "role" | "active">>) => {
    setBusy(true);
    try {
      await api.updateTeamMember(target.userId, changes);
      await loadTeam();
      onSuccess("Usuário atualizado.");
    } catch (error) { onError(error instanceof Error ? error.message : "Não foi possível atualizar o usuário"); }
    finally { setBusy(false); }
  };
  const changePassword = async () => {
    if (password.next !== password.confirm) { onError("A confirmação da nova senha não confere."); return; }
    setBusy(true);
    try {
      await api.changePassword(password.current, password.next);
      setPassword({ current: "", next: "", confirm: "" });
      await loadSessions();
      onSuccess("Senha alterada. As outras sessões foram encerradas.");
    } catch (error) { onError(error instanceof Error ? error.message : "Não foi possível alterar a senha"); }
    finally { setBusy(false); }
  };
  const revokeSession = async (sessionId: string) => {
    setBusy(true);
    try { await api.revokeSession(sessionId); await loadSessions(); onSuccess("Sessão encerrada."); }
    catch (error) { onError(error instanceof Error ? error.message : "Não foi possível encerrar a sessão"); }
    finally { setBusy(false); }
  };
  const revokeOthers = async () => {
    setBusy(true);
    try { const result=await api.revokeOtherSessions(); await loadSessions(); onSuccess(`${result.revoked} outra(s) sessão(ões) encerrada(s).`); }
    catch (error) { onError(error instanceof Error ? error.message : "Não foi possível encerrar as sessões"); }
    finally { setBusy(false); }
  };

  const saveOrganization = async () => {
    setBusy(true);
    try {
      const result = await api.updateOrganization(settings);
      onOrganizationChanged(result.organization);
      onSuccess("Dados da empresa e documentos legais atualizados.");
    } catch (error) { onError(error instanceof Error ? error.message : "Não foi possível atualizar a empresa"); }
    finally { setBusy(false); }
  };
  const readNotification = async (id: string) => {
    setBusy(true);
    try { await api.notificationRead(id); await loadNotifications(); }
    catch (error) { onError(error instanceof Error ? error.message : "Não foi possível atualizar o aviso"); }
    finally { setBusy(false); }
  };
  const readAllNotifications = async () => {
    setBusy(true);
    try { await api.notificationsReadAll(); await loadNotifications(); onSuccess("Avisos marcados como lidos."); }
    catch (error) { onError(error instanceof Error ? error.message : "Não foi possível atualizar os avisos"); }
    finally { setBusy(false); }
  };

  return <div className="stack-lg">
    <div className="admin-grid">
      <Card title="Conta e assinatura"><div className="form-stack">
        <div className="compact-row"><ShieldCheck/><div><strong>{organization?.name ?? "Empresa"}</strong><small>Plano {organization?.plan ?? "não informado"}</small></div><Badge tone={organization?.operational ? "green" : "red"}>{organization?.status ?? "indisponível"}</Badge></div>
        {organization?.trialEndsAt&&<p className="muted">Teste até {new Date(organization.trialEndsAt).toLocaleString("pt-BR")}.</p>}
        {organization?.accessEndsAt&&<p className="muted">Acesso temporário até {new Date(organization.accessEndsAt).toLocaleString("pt-BR")}.</p>}
        <p className="muted">E-mail de cobrança: {organization?.billingEmail || "não cadastrado"}</p>
        {organization&&<div className="usage-grid">
          <span>Unidades <strong>{organization.usage.venues}/{organization.limits.maxVenues}</strong></span>
          <span>Usuários ativos <strong>{organization.usage.activeUsers}/{organization.limits.maxUsers}</strong></span>
          <span>Áreas <strong>{organization.usage.zones}</strong> • limite {organization.limits.maxZonesPerVenue} por unidade</span>
        </div>}
      </div></Card>
      <Card title="Alterar minha senha"><div className="form-stack">
        <Field type="password" value={password.current} onChange={(event)=>setPassword({...password,current:event.target.value})} placeholder="Senha atual" autoComplete="current-password"/>
        <Field type="password" value={password.next} onChange={(event)=>setPassword({...password,next:event.target.value})} placeholder="Nova senha forte" autoComplete="new-password"/>
        <Field type="password" value={password.confirm} onChange={(event)=>setPassword({...password,confirm:event.target.value})} placeholder="Confirmar nova senha" autoComplete="new-password"/>
        <Button disabled={busy||password.current.length<1||password.next.length<10||password.confirm.length<10} onClick={()=>void changePassword()}><KeyRound/> Alterar senha</Button>
      </div></Card>
    </div>
    <div className="admin-grid">
      <Card title="Autenticação em duas etapas"><div className="form-stack">
        <div className="compact-row"><ShieldCheck/><div><strong>{mfaStatus.enabled?"MFA ativado":"MFA ainda não ativado"}</strong><small>{mfaStatus.required?"Obrigatório para seu perfil":"Recomendado para proteger a conta"}{mfaStatus.enabled?` • ${mfaStatus.recoveryCodesRemaining} códigos restantes`:""}</small></div><Badge tone={mfaStatus.enabled?"green":"amber"}>{mfaStatus.enabled?"protegido":"atenção"}</Badge></div>
        {!mfaStatus.enabled&&!mfaUri&&<Button disabled={busy} onClick={()=>void beginMfa()}><ShieldCheck/> Ativar MFA</Button>}
        {mfaUri&&<><div style={{display:"flex",justifyContent:"center",padding:12,background:"white",borderRadius:14}}><QRCodeSVG value={mfaUri} size={180}/></div><Field value={mfaCode} onChange={event=>setMfaCode(event.target.value)} placeholder="Código de seis dígitos" inputMode="numeric" autoComplete="one-time-code"/><Button disabled={busy||mfaCode.length<6} onClick={()=>void verifyMfa()}>Confirmar ativação</Button></>}
        {recoveryCodes.length>0&&<><div className="recovery-codes">{recoveryCodes.map(code=><code key={code}>{code}</code>)}</div><Button variant="secondary" onClick={()=>void copyRecovery()}><Copy/> Copiar códigos</Button><p className="muted">Eles são exibidos uma única vez.</p></>}
        {mfaStatus.enabled&&!mfaStatus.required&&<Button variant="danger" disabled={busy} onClick={()=>void turnOffMfa()}>Desativar MFA após confirmação reforçada</Button>}
      </div></Card>
      <Card title="Confirmar ação sensível"><div className="form-stack">
        <p className="muted">Antes de alterar usuários, empresa, cobrança ou clientes, confirme novamente sua senha e o MFA. A confirmação vale por poucos minutos.</p>
        <Field type="password" value={stepUp.password} onChange={event=>setStepUp({...stepUp,password:event.target.value})} placeholder="Senha atual" autoComplete="current-password"/>
        <Field value={stepUp.code} onChange={event=>setStepUp({...stepUp,code:event.target.value})} placeholder="Código MFA" inputMode="numeric" autoComplete="one-time-code"/>
        <Button disabled={busy||!stepUp.password||stepUp.code.length<6||!mfaStatus.enabled} onClick={()=>void confirmStepUp()}><ShieldCheck/> Confirmar identidade</Button>
      </div></Card>
    </div>
    <Card title={`Avisos internos (${notifications.filter(item=>!item.readAt).length} não lidos)`} action={<Button variant="ghost" disabled={busy||notifications.every(item=>item.readAt)} onClick={()=>void readAllNotifications()}>Marcar todos</Button>}>
      <div className="form-stack">
        {notifications.map((item)=><div className={`compact-row notification-${item.severity}`} key={item.id}><Bell/><div><strong>{item.title}</strong><small>{item.message}</small><small>{new Date(item.createdAt).toLocaleString("pt-BR")}</small></div>{item.readAt?<Badge tone="green">lido</Badge>:<Button variant="secondary" disabled={busy} onClick={()=>void readNotification(item.id)}>Marcar lido</Button>}</div>)}
        {!notifications.length&&<p className="muted">Nenhum aviso operacional no momento.</p>}
      </div>
    </Card>
    {canViewBilling&&<Card title="Cobranças e faturas">
      <div className="form-stack">
        {invoices.map((invoice)=><div className="compact-row" key={invoice.id}><ShieldCheck/><div><strong>{invoice.reference}</strong><small>Vencimento: {new Date(invoice.dueAt).toLocaleDateString("pt-BR")}{invoice.paidAt?` • pago em ${new Date(invoice.paidAt).toLocaleDateString("pt-BR")}`:""}</small><small>{invoice.notes||"Mensalidade VibeVenue"}</small></div><div><strong>{(invoice.amountCents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</strong><Badge tone={invoice.status==="paid"?"green":invoice.status==="overdue"?"red":invoice.status==="void"?"purple":"amber"}>{invoice.status}</Badge></div></div>)}
        {!invoices.length&&<p className="muted">Nenhuma fatura registrada para esta empresa.</p>}
      </div>
    </Card>}
    {identity.role==="owner"&&<Card title="Empresa, privacidade e termos"><div className="form-stack">
      <Field value={settings.name} onChange={event=>setSettings({...settings,name:event.target.value})} placeholder="Nome da empresa"/>
      <Field type="email" value={settings.billingEmail} onChange={event=>setSettings({...settings,billingEmail:event.target.value})} placeholder="E-mail de cobrança"/>
      <label className="check-line"><input type="checkbox" checked={settings.requireGuestConsent} onChange={event=>setSettings({...settings,requireGuestConsent:event.target.checked})}/> Exigir aceite do visitante antes de entrar</label>
      <Field value={settings.privacyPolicyUrl} onChange={event=>setSettings({...settings,privacyPolicyUrl:event.target.value})} placeholder="URL pública da política de privacidade"/>
      <Field value={settings.privacyVersion} onChange={event=>setSettings({...settings,privacyVersion:event.target.value})} placeholder="Versão da política, ex.: 1.0"/>
      <Field value={settings.termsUrl} onChange={event=>setSettings({...settings,termsUrl:event.target.value})} placeholder="URL pública dos termos de uso"/>
      <Field value={settings.termsVersion} onChange={event=>setSettings({...settings,termsVersion:event.target.value})} placeholder="Versão dos termos, ex.: 1.0"/>
      <Button disabled={busy||settings.name.length<2||!settings.billingEmail.includes("@")||(settings.requireGuestConsent&&(!settings.privacyPolicyUrl.startsWith("https://")||!settings.termsUrl.startsWith("https://")))} onClick={()=>void saveOrganization()}><ShieldCheck/> Salvar configurações</Button>
      <p className="muted">Use URLs HTTPS. Ao alterar uma versão ou ativar o aceite, sessões antigas deixam de valer e o visitante precisa revisar os documentos atuais.</p>
    </div></Card>}
    <Card title="Sessões e dispositivos" action={<Button variant="ghost" disabled={busy||sessions.filter(item=>!item.current).length===0} onClick={()=>void revokeOthers()}>Encerrar outras</Button>}>
      <div className="form-stack">
        {sessions.map((session)=><div className="compact-row" key={session.id}><MonitorPlay/><div><strong>{session.current?"Este dispositivo":"Outro dispositivo"}</strong><small title={session.userAgent}>{session.userAgent.slice(0,110)}</small><small>Último uso: {new Date(session.lastSeenAt).toLocaleString("pt-BR")} • expira em {new Date(session.expiresAt).toLocaleDateString("pt-BR")}</small></div>{session.current?<Badge tone="green">atual</Badge>:<Button variant="danger" disabled={busy} onClick={()=>void revokeSession(session.id)}>Encerrar</Button>}</div>)}
        {!sessions.length&&<p className="muted">Nenhuma sessão ativa encontrada.</p>}
      </div>
    </Card>

    <Card title="Eventos de segurança recentes">
      <div className="form-stack">
        {securityEvents.map((event)=><div className="compact-row" key={event.id}><ShieldCheck/><div><strong>{event.eventType.replaceAll("_"," ")}</strong><small>{event.userName||"Sistema"} • {new Date(event.createdAt).toLocaleString("pt-BR")}</small></div><Badge tone={event.severity==="critical"?"red":event.severity==="warning"?"amber":"green"}>{event.severity}</Badge></div>)}
        {!securityEvents.length&&<p className="muted">Nenhum evento de segurança registrado.</p>}
      </div>
    </Card>
    {canManageTeam&&<Card title="Atividade administrativa recente"><div className="form-stack">
      {auditLogs.map((entry)=><div className="compact-row" key={entry.id}><ShieldCheck/><div><strong>{entry.action} • {entry.entityType}</strong><small>{entry.userName||"Sistema"} • {new Date(entry.createdAt).toLocaleString("pt-BR")}</small><small>{entry.requestId?`Protocolo ${entry.requestId}`:"Sem protocolo associado"}</small></div>{entry.entityId&&<Badge tone="purple">{entry.entityId.slice(0,18)}</Badge>}</div>)}
      {!auditLogs.length&&<p className="muted">Nenhuma atividade administrativa registrada.</p>}
    </div></Card>}
    {canManageTeam&&<>
      <Card title="Equipe e permissões"><div className="form-stack">
        {members.map((item)=><div className="compact-row" key={item.userId}><div className="user-avatar">{item.name.slice(0,1).toUpperCase()}</div><div><strong>{item.name}</strong><small>{item.email}</small></div><Select value={item.role} disabled={busy||(identity.role!=="owner"&&["owner","manager"].includes(item.role))} onChange={(event)=>void updateMember(item,{role:event.target.value as Role})}>{(identity.role==="owner"?allRoles:availableRoles).map((role)=><option key={role} value={role}>{roleLabels[role]}</option>)}</Select><Button variant={item.active?"secondary":"ghost"} disabled={busy||item.userId===identity.userId} onClick={()=>void updateMember(item,{active:!item.active})}>{item.active?"Desativar":"Reativar"}</Button></div>)}
        {!members.length&&<p className="muted">Nenhum usuário adicional cadastrado.</p>}
      </div></Card>
      <Card title="Adicionar usuário"><div className="form-stack">
        <Field value={member.name} onChange={(event)=>setMember({...member,name:event.target.value})} placeholder="Nome completo"/>
        <Field type="email" value={member.email} onChange={(event)=>setMember({...member,email:event.target.value})} placeholder="usuario@empresa.com"/>
        <Field type="password" value={member.password} onChange={(event)=>setMember({...member,password:event.target.value})} placeholder="Senha temporária forte" autoComplete="new-password"/>
        <Select value={member.role} onChange={(event)=>setMember({...member,role:event.target.value as Role})}>{availableRoles.map((role)=><option key={role} value={role}>{roleLabels[role]}</option>)}</Select>
        <Button disabled={busy||member.name.length<2||!member.email.includes("@")||member.password.length<10} onClick={()=>void createMember()}><UserPlus/> Criar usuário</Button>
        <p className="muted"><Users size={16}/> Cada pessoa deve usar sua própria conta. Não compartilhe a senha do proprietário.</p>
      </div></Card>
    </>}
  </div>;
}
