"use client";
import { useEffect,useRef,useState } from "react";
import type { PlaybackState } from "@vibevenue/contracts";

declare global { interface Window { YT?: any; onYouTubeIframeAPIReady?:()=>void; } }
export function YouTubePlayer({playback,className=""}:{playback:PlaybackState;className?:string}){
 const host=useRef<HTMLDivElement|null>(null);const player=useRef<any>(null);const [blocked,setBlocked]=useState(false);
 useEffect(()=>{if(window.YT?.Player){create();return;}if(!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')){const script=document.createElement("script");script.src="https://www.youtube.com/iframe_api";document.head.appendChild(script);}const previous=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{previous?.();create()};function create(){if(!host.current||player.current)return;player.current=new window.YT.Player(host.current,{height:"100%",width:"100%",videoId:playback.videoId??undefined,playerVars:{playsinline:1,controls:1,rel:0,origin:window.location.origin},events:{onAutoplayBlocked:()=>setBlocked(true)}})}return()=>{};},[]);
 useEffect(()=>{const p=player.current;if(!p||!playback.videoId)return;try{if(p.getVideoData?.().video_id!==playback.videoId)p.loadVideoById({videoId:playback.videoId,startSeconds:playback.currentTime});p.setVolume?.(playback.volume);const current=Number(p.getCurrentTime?.()??0);if(Math.abs(current-playback.currentTime)>5)p.seekTo?.(playback.currentTime,true);if(playback.state==="playing"){const result=p.playVideo?.();void result;}else if(playback.state==="paused")p.pauseVideo?.();else p.stopVideo?.();}catch{}},[playback]);
 return <div className={`youtube-shell ${className}`}><div ref={host}/>{blocked&&<button className="player-activate" onClick={()=>{player.current?.playVideo?.();setBlocked(false)}}>Ativar reprodução</button>}{!playback.videoId&&<div className="player-empty">Aguardando o host iniciar uma música</div>}</div>
}
