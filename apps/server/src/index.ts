import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { pinoHttp } from "pino-http";
import { config, isAllowedWebOrigin, validateProductionConfig } from "./config.js";
import { logger } from "./logger.js";
import { attachSocketAdapter, closeIntegrations, connectIntegrations } from "./integrations.js";
import { migrate } from "./migrations.js";
import { seedDemo } from "./platform.js";
import { configureHttp } from "./http.js";
import { configureSocket } from "./socket.js";
import { initializeStorage } from "./storage.js";
import { cleanupExpiredSessions, startMaintenance } from "./maintenance.js";
import { normalizeRequestId } from "./observability.js";

export function createRuntime(){const app=express();app.use(pinoHttp({logger,genReqId(request){return normalizeRequestId(request.headers["x-request-id"]);}}));app.use((request,response,next)=>{response.setHeader("x-request-id",String((request as typeof request & {id?:string}).id??normalizeRequestId(undefined)));next();});const httpServer=createServer(app);const io=new Server(httpServer,{cors:{origin(origin,cb){cb(null,isAllowedWebOrigin(origin));},credentials:true},allowRequest(request,callback){callback(null,isAllowedWebOrigin(request.headers.origin));},maxHttpBufferSize:1_000_000,pingInterval:25000,pingTimeout:20000});configureHttp(app,io);configureSocket(io);return{app,httpServer,io};}
async function main(){validateProductionConfig();await connectIntegrations();if(config.autoMigrate)await migrate();await seedDemo();await cleanupExpiredSessions();await initializeStorage();const{httpServer,io}=createRuntime();await attachSocketAdapter(io);const stopMaintenance=startMaintenance(config.maintenanceIntervalMinutes);httpServer.listen(config.port,"0.0.0.0",()=>logger.info({port:config.port},"VibeVenue iniciado"));const shutdown=async()=>{stopMaintenance();io.close();await new Promise<void>(resolve=>httpServer.close(()=>resolve()));await closeIntegrations();process.exit(0)};process.once("SIGINT",shutdown);process.once("SIGTERM",shutdown);}
if(process.env.NODE_ENV!=="test")void main().catch(error=>{logger.fatal({err:error},"Falha ao iniciar");process.exit(1)});
