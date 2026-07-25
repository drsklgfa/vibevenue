"use client";
import { useState } from "react";
import { ArrowLeft, BarChart3, Bell, Building2, CalendarDays, ClipboardList, Headphones, LayoutDashboard, MonitorPlay, Music2, QrCode, Settings, ShoppingBag, Sparkles, Users, UtensilsCrossed } from "lucide-react";
import { Badge, Button, Card, Metric } from "./ui";

type PreviewView = "admin" | "guest" | "tv";

const activity = [
  ["Pedido #184", "2 itens • Mesa 12", "Novo"],
  ["Chamada de atendimento", "Área Lounge • há 1 min", "Prioridade"],
  ["Reserva confirmada", "Evento Sunset • 4 pessoas", "Confirmada"]
] as const;

export function PortfolioPreview({ initialView, onBack }: { initialView: PreviewView; onBack: () => void }) {
  const [view, setView] = useState<PreviewView>(initialView);
  return <main className="portfolio-preview">
    <header className="portfolio-preview-nav">
      <button className="brand-lockup" onClick={onBack}><span className="logo-mark">V</span><span>VibeVenue</span></button>
      <div className="portfolio-switcher">
        <Button variant={view === "admin" ? "primary" : "ghost"} onClick={() => setView("admin")}><LayoutDashboard size={16}/> Painel</Button>
        <Button variant={view === "guest" ? "primary" : "ghost"} onClick={() => setView("guest")}><QrCode size={16}/> Cliente</Button>
        <Button variant={view === "tv" ? "primary" : "ghost"} onClick={() => setView("tv")}><MonitorPlay size={16}/> Modo TV</Button>
      </div>
      <Button variant="secondary" onClick={onBack}><ArrowLeft size={16}/> Voltar</Button>
    </header>
    <div className="portfolio-notice"><Sparkles size={16}/><span>Prévia interativa de portfólio — dados ilustrativos, sem backend conectado.</span><Badge tone="cyan">GitHub Pages</Badge></div>
    {view === "admin" && <AdminPreview/>}
    {view === "guest" && <GuestPreview/>}
    {view === "tv" && <TvPreview/>}
  </main>;
}

function AdminPreview() {
  return <section className="portfolio-canvas admin-content">
    <div className="portfolio-title"><div><span className="eyebrow">VISÃO OPERACIONAL</span><h1>Painel do Espaço Aurora</h1><p>Acompanhe operação, engajamento e receita em tempo real.</p></div><div className="live-pill"><i/> Operação ativa</div></div>
    <div className="metric-grid">
      <Metric label="Interações hoje" value="1.284" detail="+18% contra ontem"/>
      <Metric label="Pedidos" value="R$ 8.420" detail="ticket médio de R$ 74"/>
      <Metric label="Satisfação" value="4,8" detail="128 avaliações"/>
      <Metric label="Clientes ativos" value="326" detail="84 retornaram este mês"/>
    </div>
    <div className="admin-grid portfolio-grid-gap">
      <Card title="Operação ao vivo" action={<Badge tone="green">sincronizado</Badge>}>
        <div className="operation-list">
          <div className="operation amber"><span><Bell/></span><div><strong>3 chamados</strong><small>aguardando equipe</small></div></div>
          <div className="operation cyan"><span><ShoppingBag/></span><div><strong>12 pedidos</strong><small>em preparação</small></div></div>
          <div className="operation purple"><span><Music2/></span><div><strong>28 músicas</strong><small>na fila colaborativa</small></div></div>
          <div className="operation green"><span><Users/></span><div><strong>94 pessoas</strong><small>conectadas pelo QR</small></div></div>
        </div>
      </Card>
      <Card title="Atividade recente" action={<Button variant="ghost"><ClipboardList size={15}/> Ver fila</Button>}>
        {activity.map(([title, detail, status], index) => <div className="compact-row" key={title}><span className="rank">{index + 1}</span><div><strong>{title}</strong><small>{detail}</small></div><Badge tone={index === 1 ? "amber" : index === 2 ? "green" : "cyan"}>{status}</Badge></div>)}
      </Card>
      <Card title="Engajamento por módulo">
        <div className="portfolio-bars">
          <Progress label="Música participativa" value={86}/>
          <Progress label="Pedidos por QR" value={72}/>
          <Progress label="Eventos e reservas" value={61}/>
          <Progress label="Fidelidade" value={48}/>
        </div>
      </Card>
      <Card title="Arquitetura comercial">
        <div className="module-grid">
          <div><Building2/><span>Multiempresa</span><Badge tone="green">ativo</Badge></div>
          <div><Settings/><span>Módulos configuráveis</span><Badge tone="green">ativo</Badge></div>
          <div><BarChart3/><span>Auditoria e métricas</span><Badge tone="green">ativo</Badge></div>
          <div><CalendarDays/><span>Eventos e reservas</span><Badge tone="green">ativo</Badge></div>
        </div>
      </Card>
    </div>
  </section>;
}

function GuestPreview() {
  return <section className="portfolio-canvas guest-content">
    <Card className="guest-hero">
      <span className="eyebrow">ESPAÇO AURORA • ÁREA LOUNGE</span>
      <h1>Boa noite, Marina!</h1>
      <p>Peça músicas, chame a equipe, faça pedidos e participe da experiência sem instalar aplicativo.</p>
      <div className="guest-action-grid">
        <button><Headphones/><strong>Pedir música</strong><span>Vote na playlist</span></button>
        <button><UtensilsCrossed/><strong>Cardápio</strong><span>Peça pelo celular</span></button>
        <button><Bell/><strong>Atendimento</strong><span>Chame a equipe</span></button>
        <button><CalendarDays/><strong>Eventos</strong><span>Reserve seu lugar</span></button>
      </div>
    </Card>
    <div className="guest-grid portfolio-grid-gap">
      <Card title="Tocando agora" action={<Badge tone="purple">ao vivo</Badge>}>
        <div className="guest-now"><div className="portfolio-album"><Music2/></div><div><small>PLAYLIST COLABORATIVA</small><h3>Midnight City</h3><p>M83 • 48 votos da comunidade</p></div></div>
      </Card>
      <Card title="Seu programa de fidelidade">
        <div className="portfolio-loyalty"><strong>1.840</strong><span>pontos acumulados</span><div><i style={{width:"72%"}}/></div><small>Faltam 360 pontos para o nível Gold.</small></div>
      </Card>
      <Card title="Próximo evento">
        <div className="event-highlight"><CalendarDays/><div><Badge tone="cyan">SÁBADO • 18H</Badge><h3>Sunset Sessions</h3><p>DJ, gastronomia e experiências interativas no terraço.</p><Button>Reservar gratuitamente</Button></div></div>
      </Card>
      <Card title="Campanha ativa">
        <div className="portfolio-campaign"><Sparkles/><div><strong>Compartilhe sua experiência</strong><p>Publique uma foto no mural e ganhe 100 pontos.</p></div><Badge tone="amber">+100</Badge></div>
      </Card>
    </div>
  </section>;
}

function TvPreview() {
  return <section className="portfolio-tv">
    <div className="tv-header"><div className="brand-lockup"><span className="logo-mark">V</span><span>Espaço Aurora</span></div><div className="tv-clock">21:48 <Badge tone="green">AO VIVO</Badge></div></div>
    <div className="portfolio-tv-grid">
      <div className="portfolio-tv-player"><div className="play-disc">▶</div><span>TOCANDO AGORA</span><h1>Midnight City</h1><p>M83 • escolhida pela comunidade</p><div className="portfolio-wave"><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></div>
      <aside className="tv-side">
        <div className="tv-qr"><div className="portfolio-qr"><QrCode/></div><div><strong>Participe pelo celular</strong><span>Escaneie para pedir músicas, fazer pedidos e votar.</span></div></div>
        <div className="tv-panel"><div className="tv-panel-title"><Music2/> Próximas músicas</div>{["Blinding Lights","Levitating","As It Was"].map((song,index)=><div className="tv-queue" key={song}><span>{index+1}</span><div><strong>{song}</strong><small>{24-index*5} votos</small></div></div>)}</div>
        <div className="tv-panel"><div className="tv-panel-title"><BarChart3/> Enquete ao vivo</div><h2>Qual será o próximo tema?</h2><Progress label="Pop anos 2000" value={62}/><Progress label="Flashback" value={38}/></div>
      </aside>
    </div>
    <div className="tv-footer"><span>🎉 Happy hour até 22h</span><div className="ticker"><span>Peça pelo QR • Ganhe pontos • Confira a agenda • Compartilhe sua foto</span></div></div>
  </section>;
}

function Progress({ label, value }: { label: string; value: number }) {
  return <div className="bar-row"><span>{label}</span><div><i style={{ width: `${value}%` }}/></div><strong>{value}%</strong></div>;
}
