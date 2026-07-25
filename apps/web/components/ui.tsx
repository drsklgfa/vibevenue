"use client";
import type { ReactNode } from "react";
import clsx from "clsx";
import { CheckCircle2, X } from "lucide-react";
export function Card({children,className="",title,action}:{children:ReactNode;className?:string;title?:string;action?:ReactNode}){return <section className={clsx("card",className)}>{(title||action)&&<div className="card-head">{title&&<h2>{title}</h2>}{action}</div>}{children}</section>}
export function Button({children,variant="primary",className="",...props}:React.ButtonHTMLAttributes<HTMLButtonElement>&{variant?:"primary"|"secondary"|"ghost"|"danger"}){return <button className={clsx("button",variant,className)} {...props}>{children}</button>}
export function Field(props:React.InputHTMLAttributes<HTMLInputElement>){return <input className="field" {...props}/>}
export function Textarea(props:React.TextareaHTMLAttributes<HTMLTextAreaElement>){return <textarea className="field textarea" {...props}/>}
export function Select(props:React.SelectHTMLAttributes<HTMLSelectElement>){return <select className="field" {...props}/>}
export function Badge({children,tone="purple"}:{children:ReactNode;tone?:"purple"|"cyan"|"green"|"amber"|"red"}){return <span className={`badge ${tone}`}>{children}</span>}
export function Empty({children}:{children:ReactNode}){return <div className="empty">{children}</div>}
export function Toast({message,onClose,success=false}:{message:string;onClose:()=>void;success?:boolean}){return <div className={clsx("toast",success&&"success")}>{success?<CheckCircle2/>:null}<span>{message}</span><button onClick={onClose}><X size={18}/></button></div>}
export function Metric({label,value,detail}:{label:string;value:string|number;detail?:string}){return <div className="metric"><span>{label}</span><strong>{value}</strong>{detail&&<small>{detail}</small>}</div>}
