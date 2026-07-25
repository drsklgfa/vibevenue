"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GuestIdentity, PublicVenueSnapshot } from "@vibevenue/contracts";
import {
  ArrowLeft, Bell, CalendarDays, Camera, CheckCircle2, Gift, Headphones, Home, ImageIcon,
  LogOut, Minus, Music2, Plus, Send, ShoppingBag, Star, Ticket, Trophy, Users
} from "lucide-react";
import { api, assetUrl } from "@/lib/api";
import { useRealtime } from "@/hooks/use-realtime";
import { Badge, Button, Card, Empty, Field, Textarea } from "./ui";

type Tab = "home" | "menu" | "music" | "service" | "participate" | "benefits";
const nav: [Tab, string, typeof Home][] = [
  ["home", "Início", Home], ["menu", "Cardápio", ShoppingBag], ["music", "Música", Music2],
  ["service", "Atendimento", Bell], ["participate", "Participar", Users], ["benefits", "Benefícios", Gift]
];
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export function GuestPortal({ initialSlug = "espaco-aurora", initialZone = "SALAO", onBack, onError, onSuccess }: {
  initialSlug?: string; initialZone?: string; onBack: () => void; onError: (value: string) => void; onSuccess: (value: string) => void;
}) {
  const [token, setToken] = useState("");
  const [identity, setIdentity] = useState<GuestIdentity | null>(null);
  const [snapshot, setSnapshot] = useState<PublicVenueSnapshot | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ venueSlug: initialSlug, zoneCode: initialZone, nickname: "", acceptedPrivacy: false, acceptedTerms: false });
  const [preview, setPreview] = useState<PublicVenueSnapshot | null>(null);

  useEffect(() => {
    localStorage.removeItem("vibevenue-guest-token");
    localStorage.removeItem("vibevenue-loyalty-key");
  }, []);

  useEffect(() => {
    setPreview(null);
    setForm((current) => ({ ...current, acceptedPrivacy: false, acceptedTerms: false }));
    if (form.venueSlug.trim().length < 2 || identity) return;
    const requestedSlug = form.venueSlug.trim();
    const timer = window.setTimeout(() => {
      void api.publicVenue(requestedSlug).then((result) => setPreview(result.snapshot)).catch(() => setPreview(null));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [form.venueSlug, identity]);

  const refresh = useCallback(async () => {
    const current = token || sessionStorage.getItem("vibevenue-guest-token") || "";
    if (!current) return;
    try {
      const result = await api.guestMe(current);
      setToken(current); setIdentity(result.identity); setSnapshot(result.snapshot);
    } catch {
      sessionStorage.removeItem("vibevenue-guest-token"); setToken(""); setIdentity(null); setSnapshot(null);
    }
  }, [token]);
  useEffect(() => { void refresh(); }, [refresh]);
  useRealtime({ venueId: snapshot?.venue.id, guestToken: token, onUpdate: refresh });

  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try { await fn(); await refresh(); onSuccess(success); }
    catch (error) { onError(error instanceof Error ? error.message : "Não foi possível concluir"); }
    finally { setBusy(false); }
  };
  const join = async () => {
    setBusy(true);
    try {
      const legal = preview?.legal;
      if (legal?.requireConsent && (!form.acceptedPrivacy || !form.acceptedTerms)) throw new Error("Aceite a política de privacidade e os termos para continuar.");
      const result = await api.join({ ...form, privacyVersion: legal?.privacyVersion ?? "", termsVersion: legal?.termsVersion ?? "" });
      sessionStorage.setItem("vibevenue-guest-token", result.token);
      setToken(result.token); setIdentity(result.identity); setSnapshot(result.snapshot);
      onSuccess(`Você entrou em ${result.snapshot.venue.name}.`);
    } catch (error) { onError(error instanceof Error ? error.message : "Entrada não concluída"); }
    finally { setBusy(false); }
  };
  const leave = () => { sessionStorage.removeItem("vibevenue-guest-token"); sessionStorage.removeItem("vibevenue-loyalty-key"); setToken(""); setIdentity(null); setSnapshot(null); };

  if (!identity || !snapshot) return <main className="guest-entry">
    <button className="back-link" onClick={onBack}><ArrowLeft /> Voltar</button>
    <div className="guest-entry-grid">
      <Card className="guest-welcome"><span className="logo-mark large">V</span><span className="eyebrow">PORTAL DO CLIENTE</span>
        <h1>Entre, participe e acompanhe a experiência.</h1>
        <p>Sem instalação e sem cadastro obrigatório. O QR identifica o estabelecimento e a área.</p>
        <div className="guest-benefits"><span><ShoppingBag /> Consulte e faça pedidos</span><span><Headphones /> Peça e vote em músicas</span><span><Bell /> Chame atendimento</span><span><Trophy /> Participe de quiz e enquetes</span></div>
      </Card>
      <Card title="Entrar no estabelecimento"><div className="form-stack">
        <label>Identificador do local<Field value={form.venueSlug} onChange={event => setForm({ ...form, venueSlug: event.target.value })} placeholder="espaco-aurora" /></label>
        <label>Código da área ou mesa<Field value={form.zoneCode} onChange={event => setForm({ ...form, zoneCode: event.target.value.toUpperCase() })} placeholder="SALAO" /></label>
        <label>Como devemos chamar você?<Field value={form.nickname} onChange={event => setForm({ ...form, nickname: event.target.value })} placeholder="Seu nome ou apelido" /></label>
        {preview?.legal.requireConsent&&<div className="consent-box">
          <label><input type="checkbox" checked={form.acceptedPrivacy} onChange={event=>setForm({...form,acceptedPrivacy:event.target.checked})}/> Li e aceito a {preview.legal.privacyPolicyUrl?<a href={preview.legal.privacyPolicyUrl} target="_blank" rel="noreferrer">política de privacidade</a>:"política de privacidade"} (versão {preview.legal.privacyVersion}).</label>
          <label><input type="checkbox" checked={form.acceptedTerms} onChange={event=>setForm({...form,acceptedTerms:event.target.checked})}/> Li e aceito os {preview.legal.termsUrl?<a href={preview.legal.termsUrl} target="_blank" rel="noreferrer">termos de uso</a>:"termos de uso"} (versão {preview.legal.termsVersion}).</label>
        </div>}
        <Button disabled={busy || form.nickname.length < 2 || Boolean(preview?.legal.requireConsent&&(!form.acceptedPrivacy||!form.acceptedTerms))} onClick={join}>{busy ? "Entrando..." : "Entrar na experiência"}</Button>
        <small className="muted">{preview?`Você está entrando em ${preview.venue.name}.`:"Demonstração: espaco-aurora e áreas SALAO, EXTERNA ou VIP."}</small>
      </div></Card>
    </div>
  </main>;

  return <main className="guest-app">
    <header className="guest-header"><div className="brand-lockup"><span className="logo-mark">V</span><div><strong>{snapshot.venue.name}</strong><small>{identity.zoneName}</small></div></div>
      <div><span className="guest-name">Olá, {identity.nickname}</span><button onClick={leave} aria-label="Sair"><LogOut /></button></div></header>
    <section className="guest-content">
      {tab === "home" && <GuestHome snapshot={snapshot} identity={identity} setTab={setTab} />}
      {tab === "menu" && <GuestMenu snapshot={snapshot} token={token} busy={busy} run={run} />}
      {tab === "music" && <GuestMusic snapshot={snapshot} token={token} busy={busy} run={run} />}
      {tab === "service" && <GuestService token={token} busy={busy} run={run} />}
      {tab === "participate" && <GuestParticipate snapshot={snapshot} token={token} busy={busy} run={run} />}
      {tab === "benefits" && <GuestBenefits snapshot={snapshot} identity={identity} token={token} busy={busy} run={run} />}
    </section>
    <nav className="guest-nav">{nav.map(([id, label, Icon]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon /><span>{label}</span></button>)}</nav>
  </main>;
}

function GuestHome({ snapshot, identity, setTab }: { snapshot: PublicVenueSnapshot; identity: GuestIdentity; setTab: (tab: Tab) => void }) {
  const current = snapshot.queue.find(item => item.id === snapshot.playback.itemId);
  return <div className="stack-lg">
    <Card className="guest-hero"><span className="eyebrow">EXPERIÊNCIA AO VIVO</span><h1>Bem-vindo, {identity.nickname}.</h1>
      <p>Você está em <strong>{identity.zoneName}</strong>. Escolha como participar.</p>
      <div className="guest-action-grid">
        <button onClick={() => setTab("menu")}><ShoppingBag /><strong>Ver cardápio</strong><span>Faça pedidos pelo QR</span></button>
        <button onClick={() => setTab("music")}><Headphones /><strong>Pedir música</strong><span>Veja a fila e vote</span></button>
        <button onClick={() => setTab("service")}><Bell /><strong>Chamar equipe</strong><span>Atendimento por área</span></button>
        <button onClick={() => setTab("participate")}><Users /><strong>Participar</strong><span>Quiz, enquete e fotos</span></button>
      </div>
    </Card>
    {snapshot.announcements.map(item => <div className={`announcement ${item.kind}`} key={item.id}><Bell /><div><strong>{item.title}</strong><p>{item.body}</p></div></div>)}
    <div className="guest-grid">
      <Card title="Tocando agora">{current ? <div className="guest-now">{current.youtubeId && <img src={`https://i.ytimg.com/vi/${current.youtubeId}/mqdefault.jpg`} alt="" />}<div><Badge tone="green">{snapshot.playback.state}</Badge><h3>{current.title}</h3><p>Pedido por {current.requestedBy}</p></div></div> : <Empty>O host ainda não iniciou uma música.</Empty>}</Card>
      <Card title="Próximo evento">{snapshot.events[0] ? <div className="event-highlight"><CalendarDays /><div><strong>{snapshot.events[0].title}</strong><p>{snapshot.events[0].description}</p><small>{new Date(snapshot.events[0].startsAt).toLocaleString("pt-BR")}</small></div></div> : <Empty>Nenhum evento anunciado.</Empty>}</Card>
    </div>
    <Card title="Mural do local"><div className="guest-media-strip">{snapshot.media.length ? snapshot.media.slice(0, 8).map(post => <img key={post.id} src={assetUrl(post.imageUrl)} alt={post.caption} />) : <Empty>As fotos aprovadas aparecerão aqui.</Empty>}</div></Card>
  </div>;
}

function GuestMenu({ snapshot, token, busy, run }: { snapshot: PublicVenueSnapshot; token: string; busy: boolean; run: (fn: () => Promise<unknown>, success: string) => Promise<void> }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const items = snapshot.menu.flatMap(category => category.items).filter(item => item.available);
  const total = items.reduce((sum, item) => sum + item.priceCents * (cart[item.id] ?? 0), 0);
  const count = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const change = (id: string, delta: number) => setCart(current => ({ ...current, [id]: Math.max(0, Math.min(20, (current[id] ?? 0) + delta)) }));
  const submit = async () => {
    await api.order(token, { note, items: Object.entries(cart).filter(([, quantity]) => quantity > 0).map(([itemId, quantity]) => ({ itemId, quantity })) });
    setCart({}); setNote("");
  };
  return <div className="stack-lg">
    <Card className="service-intro"><ShoppingBag /><h1>Cardápio e pedidos</h1><p>Escolha os itens e acompanhe a confirmação pela equipe.</p></Card>
    {snapshot.menu.length ? snapshot.menu.map(category => <Card key={category.id} title={category.name}><div className="menu-grid">
      {category.items.map(item => <article className={`menu-item ${item.available ? "" : "unavailable"}`} key={item.id}><div><div className="title-line"><strong>{item.name}</strong>{item.featured && <Badge tone="purple">destaque</Badge>}</div><p>{item.description}</p><b>{money(item.priceCents)}</b></div><div className="quantity"><button disabled={!item.available || (cart[item.id] ?? 0) === 0} onClick={() => change(item.id, -1)}><Minus /></button><span>{cart[item.id] ?? 0}</span><button disabled={!item.available} onClick={() => change(item.id, 1)}><Plus /></button></div></article>)}
    </div></Card>) : <Card><Empty>O estabelecimento ainda não publicou o cardápio.</Empty></Card>}
    {count > 0 && <Card title={`Seu pedido • ${count} item(ns)`}><div className="order-summary"><Textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Observação opcional" maxLength={300} /><div><strong>Total: {money(total)}</strong><Button disabled={busy} onClick={() => void run(submit, "Pedido enviado para a equipe.")}><ShoppingBag /> Confirmar pedido</Button></div></div></Card>}
  </div>;
}

function GuestMusic({ snapshot, token, busy, run }: { snapshot: PublicVenueSnapshot; token: string; busy: boolean; run: (fn: () => Promise<unknown>, success: string) => Promise<void> }) {
  const [title, setTitle] = useState(""); const [url, setUrl] = useState("");
  return <div className="stack-lg"><Card title="Pedir uma música"><div className="form-stack"><Field value={title} onChange={event => setTitle(event.target.value)} placeholder="Nome da música" /><Field value={url} onChange={event => setUrl(event.target.value)} placeholder="Link do vídeo no YouTube" /><Button disabled={busy || !title || !url} onClick={() => void run(() => api.music(token, { title, url }), "Pedido enviado para aprovação do host.")}><Send /> Enviar pedido</Button><small className="muted">O host aprova o conteúdo e controla a reprodução na TV.</small></div></Card>
    <Card title={`Fila aprovada (${snapshot.queue.length})`}><div className="table-list">{snapshot.queue.length ? snapshot.queue.map(item => <div className="guest-music-row" key={item.id}>{item.youtubeId ? <img src={`https://i.ytimg.com/vi/${item.youtubeId}/mqdefault.jpg`} alt="" /> : <Headphones />}<div className="grow"><strong>{item.title}</strong><small>{item.requestedBy} • {item.votes} votos</small></div><Badge tone={item.status === "playing" ? "green" : "purple"}>{item.status}</Badge><Button variant="ghost" disabled={busy} onClick={() => void run(() => api.musicVote(token, item.id), "Seu voto foi registrado.")}>▲ Votar</Button></div>) : <Empty>Nenhuma música aprovada ainda.</Empty>}</div></Card>
  </div>;
}

function GuestService({ token, busy, run }: { token: string; busy: boolean; run: (fn: () => Promise<unknown>, success: string) => Promise<void> }) {
  const [note, setNote] = useState("");
  const options = ["attendance", "bill", "water", "cleaning", "accessibility", "manager", "information", "other"] as const;
  const labels: Record<string, string> = { attendance: "Chamar atendimento", bill: "Solicitar conta", water: "Solicitar água", cleaning: "Solicitar limpeza", accessibility: "Apoio de acessibilidade", manager: "Falar com responsável", information: "Pedir informação", other: "Outro pedido" };
  return <div className="stack-lg"><Card className="service-intro"><Bell /><h1>Como a equipe pode ajudar?</h1><p>A solicitação chega ao painel com sua área identificada.</p></Card><div className="service-grid">{options.map(type => <button key={type} disabled={busy} onClick={() => void run(() => api.service(token, { type, note, priority: type === "accessibility" ? "high" : "normal" }), `${labels[type]} enviado.`)}><Bell /><strong>{labels[type]}</strong></button>)}</div><Card title="Observação opcional"><Textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Inclua detalhes para facilitar o atendimento" maxLength={300} /></Card></div>;
}

function GuestParticipate({ snapshot, token, busy, run }: { snapshot: PublicVenueSnapshot; token: string; busy: boolean; run: (fn: () => Promise<unknown>, success: string) => Promise<void> }) {
  const [score, setScore] = useState(5); const [comment, setComment] = useState(""); const [caption, setCaption] = useState(""); const [file, setFile] = useState<File | null>(null);
  const [quizResult, setQuizResult] = useState<string>("");
  const upload = () => { if (!file) return Promise.reject(new Error("Selecione uma foto.")); const form = new FormData(); form.set("image", file); form.set("caption", caption); return api.media(token, form); };
  const answer = async (selectedIndex: number) => {
    if (!snapshot.quiz?.currentQuestion) return;
    const result = await api.quizAnswer(token, snapshot.quiz.currentQuestion.id, selectedIndex);
    setQuizResult(result.correct ? "Resposta correta!" : "Resposta registrada. Confira o resultado com o host.");
  };
  return <div className="stack-lg">
    {snapshot.quiz?.currentQuestion && <Card title={snapshot.quiz.title}><span className="eyebrow">QUIZ AO VIVO</span><h2>{snapshot.quiz.currentQuestion.prompt}</h2><div className="poll-options">{snapshot.quiz.currentQuestion.options.map((option, index) => <button disabled={busy} key={option} onClick={() => void run(() => answer(index), "Resposta enviada.")}><span>{option}</span><Badge tone="cyan">{String.fromCharCode(65 + index)}</Badge></button>)}</div>{quizResult && <p className="quiz-result">{quizResult}</p>}</Card>}
    {snapshot.poll && <Card title={snapshot.poll.question}><div className="poll-options">{snapshot.poll.options.map(option => <button disabled={busy} key={option.id} onClick={() => void run(() => api.pollVote(token, snapshot.poll!.id, option.id), "Voto registrado.")}><span>{option.label}</span><Badge tone="cyan">{option.votes}</Badge></button>)}</div><small className="muted">{snapshot.poll.totalVotes} votos no total</small></Card>}
    <div className="guest-grid"><Card title="Enviar foto para o mural"><div className="form-stack"><label className="file-drop"><Camera /><span>{file?.name ?? "Escolher imagem"}</span><input type="file" accept="image/*" onChange={event => setFile(event.target.files?.[0] ?? null)} /></label><Field value={caption} onChange={event => setCaption(event.target.value)} placeholder="Legenda opcional" /><Button disabled={busy || !file} onClick={() => void run(upload, "Foto enviada para aprovação.")}><ImageIcon /> Enviar para moderação</Button></div></Card>
      <Card title="Avaliar experiência"><div className="stars">{[1, 2, 3, 4, 5].map(value => <button key={value} onClick={() => setScore(value)}><Star fill={value <= score ? "currentColor" : "none"} /></button>)}</div><Textarea value={comment} onChange={event => setComment(event.target.value)} placeholder="Conte o que mais gostou ou o que pode melhorar" /><Button disabled={busy} onClick={() => void run(() => api.feedback(token, score, comment), "Obrigado pela avaliação.")}><CheckCircle2 /> Enviar avaliação</Button></Card></div>
  </div>;
}

function GuestBenefits({ snapshot, identity, token, busy, run }: { snapshot: PublicVenueSnapshot; identity: GuestIdentity; token: string; busy: boolean; run: (fn: () => Promise<unknown>, success: string) => Promise<void> }) {
  const [key, setKey] = useState(""); const [code, setCode] = useState(""); const [contact, setContact] = useState(""); const [party, setParty] = useState(2);
  const reservations = useMemo(() => snapshot.events, [snapshot.events]);
  return <div className="stack-lg"><div className="guest-grid"><Card title="Fidelidade"><p>Registre sua visita uma vez por dia e acumule pontos.</p><Field value={key} onChange={event => setKey(event.target.value)} placeholder="Seu e-mail ou telefone" /><Button disabled={busy || key.length < 4} onClick={() => void run(async () => { const result = await api.loyalty(token, key, identity.nickname); sessionStorage.setItem("vibevenue-loyalty-key", key); return result; }, "Check-in realizado e pontos atualizados.")}><Gift /> Registrar visita</Button></Card>
    <Card title="Resgatar cupom"><Field value={code} onChange={event => setCode(event.target.value.toUpperCase())} placeholder="Código do cupom" /><Button disabled={busy || !code || key.length < 4} onClick={() => void run(() => api.redeem(token, code, key), "Cupom validado. Mostre a confirmação à equipe.")}><Ticket /> Validar código</Button>{snapshot.campaigns.map(campaign => <div className="campaign-mini" key={campaign.id}><strong>{campaign.title}</strong><span>{campaign.reward}</span><Badge tone="green">{campaign.code}</Badge></div>)}</Card></div>
    <Card title="Eventos e reservas"><div className="event-grid">{reservations.length ? reservations.map(event => <article className="event-card" key={event.id}><CalendarDays /><div className="grow"><h3>{event.title}</h3><p>{event.description}</p><small>{new Date(event.startsAt).toLocaleString("pt-BR")} • {event.reservations}/{event.capacity || "∞"} reservas</small></div><Field value={contact} onChange={e => setContact(e.target.value)} placeholder="Contato" /><Field type="number" min="1" max="20" value={party} onChange={e => setParty(Number(e.target.value))} /><Button disabled={busy || contact.length < 3} onClick={() => void run(() => api.reserve(token, event.id, contact, party), "Reserva confirmada.")}>Reservar</Button></article>) : <Empty>Nenhum evento disponível para reserva.</Empty>}</div></Card>
  </div>;
}
