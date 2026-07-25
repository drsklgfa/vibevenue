"use client";
import { useEffect } from "react";
import { io } from "socket.io-client";
import { API_URL } from "@/lib/api";
export function useRealtime(input:{venueId?:string|undefined;slug?:string|undefined;admin?:boolean|undefined;guestToken?:string|undefined;onUpdate:()=>void;onPlayback?:((value:unknown)=>void)|undefined}){
 useEffect(()=>{if(!input.venueId&&!input.slug)return;const socket=io(API_URL,{transports:["websocket"],forceNew:true,withCredentials:true});socket.on("connect",()=>{if(input.admin&&input.venueId)socket.emit("admin:watch",{venueId:input.venueId},()=>undefined);else if(input.guestToken)socket.emit("guest:watch",{token:input.guestToken},()=>undefined);else socket.emit("venue:watch",{venueId:input.venueId,slug:input.slug},()=>undefined)});socket.on("venue:update",input.onUpdate);socket.on("playback:update",value=>input.onPlayback?.(value));return()=>{socket.disconnect();};},[input.venueId,input.slug,input.admin,input.guestToken,input.onUpdate,input.onPlayback]);
}
