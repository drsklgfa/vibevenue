import { appHref } from "@/lib/base-path";
export default function Offline(){return <main className="offline"><span className="logo-mark large">V</span><h1>Conexão indisponível</h1><p>Assim que a internet voltar, a experiência será sincronizada novamente.</p><a href={appHref("/")}>Tentar novamente</a></main>}
