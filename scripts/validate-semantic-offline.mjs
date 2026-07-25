import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
async function loadTypeScript() {
  const candidates = [
    path.join(root, "node_modules/typescript/lib/typescript.js"),
    "/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js"
  ];
  for (const candidate of candidates) if (fs.existsSync(candidate)) return import(pathToFileURL(candidate).href);
  throw new Error("TypeScript não encontrado. Instale as dependências ou disponibilize o compilador global.");
}
const ts = await loadTypeScript();
const files = [];
function walk(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (["node_modules", ".next", "dist", "out", ".git"].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) files.push(full);
  }
}
walk(path.join(root, "apps"));
walk(path.join(root, "packages"));

const shim = String.raw`
declare module "zod" { export namespace z { type infer<T> = any; } export const z: any; }
declare module "express" { export type Request = any; export type Response = any; export type NextFunction = any; export type Express = any; const value: any; export default value; }
declare module "compression" { const value: any; export default value; }
declare module "cors" { const value: any; export default value; }
declare module "express-rate-limit" { const value: any; export default value; }
declare module "helmet" { const value: any; export default value; }
declare module "multer" { const value: any; export default value; }
declare module "nanoid" { export const nanoid: (...args: any[]) => string; }
declare module "pg" {
 export interface QueryResultRow { [column: string]: any }
 export type QueryResult<T extends QueryResultRow=any>={rows:T[];rowCount:number|null};
 export interface PoolClient { query<T extends QueryResultRow=any>(...args:any[]):Promise<QueryResult<T>>; release():void; }
 export class Pool { constructor(...args:any[]); query<T extends QueryResultRow=any>(...args:any[]):Promise<QueryResult<T>>; connect():Promise<PoolClient>; end():Promise<void>; on(...args:any[]):any; }
}
declare module "pino" { const value: any; export default value; }
declare module "pino-http" { export const pinoHttp: any; }
declare module "redis" { export const createClient: any; }
declare module "sharp" { const value: any; export default value; }
declare module "socket.io" { export type Socket=any; export class Server { constructor(...args:any[]); on(...args:any[]):any; to(...args:any[]):any; close(...args:any[]):any; adapter(...args:any[]):any; } }
declare module "socket.io-client" { export type Socket=any; export const io:any; }
declare module "@socket.io/redis-adapter" { export const createAdapter:any; }
declare module "@aws-sdk/client-s3" { export class S3Client { constructor(...args:any[]); send(...args:any[]):any; } export class PutObjectCommand {constructor(...args:any[])} export class DeleteObjectCommand {constructor(...args:any[])} export class GetObjectCommand {constructor(...args:any[])} export class HeadBucketCommand {constructor(...args:any[])} }
declare module "@aws-sdk/s3-request-presigner" { export const getSignedUrl:any; }
declare module "dotenv/config" {}
declare module "next" { export type Metadata=any; export type Viewport=any; export type NextConfig=any; export namespace MetadataRoute { type Manifest=any; } }
declare namespace React {
 type ReactNode = any; type SetStateAction<S> = S | ((prev:S)=>S); type Dispatch<A> = (value:A)=>void;
 interface MutableRefObject<T> { current:T; } interface HTMLAttributes<T> { [key:string]:any }
 interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> {} interface InputHTMLAttributes<T> extends HTMLAttributes<T> {}
 interface SelectHTMLAttributes<T> extends HTMLAttributes<T> {} interface TextareaHTMLAttributes<T> extends HTMLAttributes<T> {}
 function useState<S>(initial:S|(()=>S)): [S, Dispatch<SetStateAction<S>>];
 function useState<S=undefined>(): [S|undefined, Dispatch<SetStateAction<S|undefined>>];
 function useEffect(effect:()=>void|(()=>void), deps?:readonly unknown[]):void;
 function useMemo<T>(factory:()=>T,deps:readonly unknown[]):T;
 function useCallback<T extends (...args:any[])=>any>(callback:T,deps:readonly unknown[]):T;
 function useRef<T>(initial:T):MutableRefObject<T>;
}
declare module "react" { export = React; }
declare module "clsx" { const value:any; export default value; }
declare module "lucide-react" {
 export const ArrowLeft:any, ArrowRight:any, BarChart3:any, Bell:any, Building2:any, CalendarDays:any, Camera:any, Check:any, CheckCircle2:any, ChevronRight:any, ClipboardList:any, Copy:any, Clock:any, Gift:any, Headphones:any, Home:any, ImageIcon:any, KeyRound:any, LayoutDashboard:any, LogOut:any, MapPin:any, MessageSquareText:any, Minus:any, MonitorPlay:any, Music2:any, Plus:any, QrCode:any, RefreshCw:any, Send:any, Settings:any, ShieldCheck:any, ShoppingBag:any, Sparkles:any, Star:any, Ticket:any, Trophy:any, UserPlus:any, Users:any, UtensilsCrossed:any, X:any;
}
declare module "qrcode.react" { export const QRCodeSVG:any; }
declare module "vitest" { export const describe:any; export const it:any; export const test:any; export const expect:any; export const beforeEach:any; export const afterEach:any; export const beforeAll:any; export const afterAll:any; export const vi:any; }
declare module "supertest" { const request:any; export default request; }
declare module "vitest/config" { export const defineConfig:any; }
declare namespace JSX { interface Element {} interface ElementClass {} interface ElementAttributesProperty { props:{} } interface ElementChildrenAttribute { children:{} } interface IntrinsicAttributes { key?: string|number } interface IntrinsicElements { [elemName: string]: any } }
`;
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "vibevenue-semantic-"));
const shimPath = path.join(temp, "offline-shims.d.ts");
fs.writeFileSync(shimPath, shim);

const typeRootCandidates = [
  path.join(root, "node_modules/@types"),
  "/opt/nvm/versions/node/v22.16.0/lib/node_modules/ts-node/node_modules/@types"
].filter((candidate) => fs.existsSync(candidate));
const options = {
  target: ts.ScriptTarget.ES2023,
  lib: ["lib.es2023.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.Preserve,
  noEmit: true,
  skipLibCheck: true,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
  resolveJsonModule: true,
  strictNullChecks: true,
  noUncheckedIndexedAccess: true,
  exactOptionalPropertyTypes: true,
  noImplicitAny: false,
  baseUrl: root,
  paths: { "@vibevenue/contracts": ["packages/contracts/src/index.ts"], "@/*": ["apps/web/*"] },
  typeRoots: typeRootCandidates
};
try {
  const program = ts.createProgram([...files, shimPath], options);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) {
    for (const diagnostic of diagnostics) {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, " ");
      if (diagnostic.file && diagnostic.start !== undefined) {
        const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        console.error(`${path.relative(root, diagnostic.file.fileName)}:${position.line + 1}:${position.character + 1} ${message}`);
      } else console.error(message);
    }
    throw new Error(`Validação semântica offline falhou com ${diagnostics.length} problema(s).`);
  }
  console.log(`Semântica offline aprovada: ${files.length} arquivos TypeScript/TSX verificados com contratos e aliases internos.`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
