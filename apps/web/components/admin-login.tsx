"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, Building2, Copy, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "@/lib/api";
import { Button, Card, Field } from "./ui";

type Stage = "credentials" | "mfa" | "recovery" | "forgot" | "reset";

export function AdminLogin({onBack,onAuthenticated,onError}:{onBack:()=>void;onAuthenticated:()=>void;onError:(value:string)=>void}){
  const[email,setEmail]=useState("");
  const[password,setPassword]=useState("");
  const[code,setCode]=useState("");
  const[stage,setStage]=useState<Stage>("credentials");
  const[enrollmentUri,setEnrollmentUri]=useState("");
  const[recoveryCodes,setRecoveryCodes]=useState<string[]>([]);
  const[resetToken,setResetToken]=useState("");
  const[newPassword,setNewPassword]=useState("");
  const[confirmPassword,setConfirmPassword]=useState("");
  const[busy,setBusy]=useState(false);
  useEffect(()=>{const token=new URLSearchParams(window.location.search).get("reset");if(token){setResetToken(token);setStage("reset")}},[]);
  const submit=async()=>{setBusy(true);try{const result=await api.login(email,password);if("mfaRequired" in result){setEnrollmentUri(result.otpauthUri??"");setStage("mfa");setCode("");}else onAuthenticated()}catch(error){onError(error instanceof Error?error.message:"Falha no login")}finally{setBusy(false)}};
  const verify=async()=>{setBusy(true);try{const result=await api.verifyMfa(code);if(result.recoveryCodes?.length){setRecoveryCodes(result.recoveryCodes);setStage("recovery");}else onAuthenticated()}catch(error){onError(error instanceof Error?error.message:"Falha na autenticação adicional")}finally{setBusy(false)}};
  const demo=async()=>{setBusy(true);try{await api.demoLogin();onAuthenticated()}catch(error){onError(error instanceof Error?error.message:"Falha no modo demonstração")}finally{setBusy(false)}};
  const copyRecovery=async()=>{await navigator.clipboard.writeText(recoveryCodes.join("\n"));};
  const forgot=async()=>{setBusy(true);try{const result=await api.forgotPassword(email);onError(result.message);setStage("credentials")}catch(error){onError(error instanceof Error?error.message:"Falha ao solicitar redefinição")}finally{setBusy(false)}};
  const reset=async()=>{if(newPassword!==confirmPassword){onError("A confirmação da senha não confere.");return}setBusy(true);try{await api.resetPassword(resetToken,newPassword);history.replaceState({},"","/?admin=1");setStage("credentials");setPassword("");setNewPassword("");setConfirmPassword("");onError("Senha redefinida. Entre novamente e confirme seu MFA.")}catch(error){onError(error instanceof Error?error.message:"Falha ao redefinir senha")}finally{setBusy(false)}};

  return <main className="auth-page"><button className="back-link" onClick={stage==="credentials"?onBack:()=>setStage("credentials")}><ArrowLeft/> Voltar</button><Card className="auth-card"><span className="logo-mark large">V</span>
    {stage==="credentials"&&<><span className="eyebrow">PAINEL VIBEVENUE</span><h1>Administre toda a experiência em um só lugar.</h1><p className="muted">Entre com sua conta individual. Perfis sensíveis usam autenticação em duas etapas.</p><div className="form-stack"><label>E-mail<Field type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="gestor@empresa.com" autoComplete="username"/></label><label>Senha<Field type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password"/></label><Button onClick={()=>void submit()} disabled={busy||!email||!password}><KeyRound size={18}/>{busy?"Entrando...":"Entrar"}</Button><Button variant="ghost" onClick={()=>setStage("forgot")}>Esqueci minha senha</Button><div className="or"><span/>ou<span/></div><Button variant="secondary" onClick={()=>void demo()} disabled={busy}><Sparkles size={18}/> Entrar no ambiente demonstrativo</Button></div><div className="demo-note"><Building2/><span>A demonstração é isolada e não deve receber dados reais.</span></div></>}
    {stage==="mfa"&&<><span className="eyebrow">AUTENTICAÇÃO REFORÇADA</span><h1>{enrollmentUri?"Proteja sua conta com MFA.":"Confirme o código do autenticador."}</h1>{enrollmentUri&&<><p className="muted">Escaneie o QR Code no Google Authenticator, Microsoft Authenticator, 1Password ou aplicativo compatível.</p><div style={{display:"flex",justifyContent:"center",padding:16,background:"white",borderRadius:16}}><QRCodeSVG value={enrollmentUri} size={190} level="M"/></div></>}<div className="form-stack"><label>Código de seis dígitos ou recuperação<Field value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="123456" inputMode="numeric" autoComplete="one-time-code"/></label><Button onClick={()=>void verify()} disabled={busy||code.trim().length<6}><ShieldCheck size={18}/>{busy?"Verificando...":"Confirmar identidade"}</Button></div></>}

    {stage==="forgot"&&<><span className="eyebrow">RECUPERAÇÃO DE CONTA</span><h1>Receba um link de uso único.</h1><p className="muted">A resposta não confirma se o e-mail está cadastrado. Isso evita descoberta de contas.</p><div className="form-stack"><Field type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="seu@email.com" autoComplete="email"/><Button disabled={busy||!email.includes("@") } onClick={()=>void forgot()}>Enviar instruções</Button></div></>}
    {stage==="reset"&&<><span className="eyebrow">NOVA SENHA</span><h1>Crie uma senha forte e exclusiva.</h1><div className="form-stack"><Field type="password" value={newPassword} onChange={event=>setNewPassword(event.target.value)} placeholder="Nova senha" autoComplete="new-password"/><Field type="password" value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)} placeholder="Confirmar senha" autoComplete="new-password"/><Button disabled={busy||newPassword.length<10||confirmPassword.length<10} onClick={()=>void reset()}>Redefinir senha</Button></div></>}
    {stage==="recovery"&&<><span className="eyebrow">CÓDIGOS DE RECUPERAÇÃO</span><h1>Guarde estes códigos agora.</h1><p className="muted">Cada código funciona uma única vez. Salve em um gerenciador de senhas ou imprima e guarde em local seguro. Eles não serão exibidos novamente.</p><div className="recovery-codes">{recoveryCodes.map(item=><code key={item}>{item}</code>)}</div><div className="form-stack"><Button variant="secondary" onClick={()=>void copyRecovery()}><Copy size={18}/> Copiar códigos</Button><Button onClick={onAuthenticated}><ShieldCheck size={18}/> Já guardei; continuar</Button></div></>}
  </Card></main>;
}
