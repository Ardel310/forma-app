"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { FileText, Upload, Eye, Download, Trash2 } from "lucide-react";
import { createClient } from "../lib/supabase/client";

type Doc = { id:string; file_name:string; file_path:string; file_size:number|null; document_type:string; created_at:string };
const categories = {nutrition_plan:"Plan nutricional",body_composition:"Análisis de composición corporal",body_measurements:"Mediciones corporales",supplements:"Suplementación",recommendations:"Recomendaciones",other:"Otros documentos"};
const bucket = "nutrition-documents";
const green = "#7D8C82";
const button: React.CSSProperties = {display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,border:0,borderRadius:12,padding:10,background:"#EEF2EE",color:"#687A6D",fontFamily:"inherit",fontSize:12,cursor:"pointer",minHeight:40};
export default function NutritionDocuments({planId}:{planId:string}) {
 const supabase = useMemo(()=>createClient(),[]);
 const [docs,setDocs]=useState<Doc[]>([]);
 const [category,setCategory]=useState<keyof typeof categories>("nutrition_plan");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const input=useRef<HTMLInputElement>(null);
 async function load(){
  const {data,error}=await supabase.from("nutrition_documents").select("id,file_name,file_path,file_size,document_type,created_at").eq("plan_id",planId).order("created_at",{ascending:false});
  if(error) throw error;
  setDocs(data??[]);
 }
 useEffect(()=>{let active=true;setLoading(true);setError("");setDocs([]);supabase.from("nutrition_documents").select("id,file_name,file_path,file_size,document_type,created_at").eq("plan_id",planId).order("created_at",{ascending:false}).then(({data,error})=>{if(!active)return;if(error)setError(error.message);else setDocs(data??[]);setLoading(false);});return()=>{active=false;};},[planId,supabase]);
 async function upload(file:File){
  setError("");
  if(file.type!=="application/pdf" || !file.name.toLowerCase().endsWith(".pdf")){setError("Selecciona un documento PDF.");return;}
  if(file.size>10*1024*1024){setError("El PDF supera los 10 MB.");return;}
  setBusy(true);
  try{
   const {data,error}=await supabase.auth.getUser();if(error||!data.user)throw new Error("Inicia sesión de nuevo.");
   const path=`${data.user.id}/${planId}/${crypto.randomUUID()}.pdf`;
   const storage=supabase.storage.from(bucket);
   const result=await storage.upload(path,file,{contentType:"application/pdf",upsert:false});if(result.error)throw result.error;
   const saved=await supabase.from("nutrition_documents").insert({user_id:data.user.id,plan_id:planId,file_name:file.name,file_path:path,file_size:file.size,document_type:category});
   if(saved.error){const cleanup=await storage.remove([path]);if(cleanup.error)throw new Error(saved.error.message+". No se pudo limpiar el archivo subido.");throw saved.error;}
   await load();
  }catch(e){setError((e as Error).message||"No se pudo subir el documento.");}finally{setBusy(false);if(input.current)input.current.value="";}
 }
 async function open(doc:Doc,download=false){
  setError("");setBusy(true);
  const tab=download?null:window.open("about:blank","_blank");if(tab)tab.opener=null;
  try{
   if(download){const {data,error}=await supabase.storage.from(bucket).download(doc.file_path);if(error)throw error;const url=URL.createObjectURL(data);const a=document.createElement("a");a.href=url;a.download=doc.file_name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
   else {const {data,error}=await supabase.storage.from(bucket).createSignedUrl(doc.file_path,60);if(error)throw error;if(tab)tab.location.href=data.signedUrl;else window.location.assign(data.signedUrl);}
  }catch(e){tab?.close();setError((e as Error).message||"No se pudo abrir el PDF.");}finally{setBusy(false);}
 }
 async function remove(doc:Doc){
  if(!window.confirm(`¿Eliminar definitivamente ${doc.file_name}?`))return;
  setBusy(true);setError("");try{const result=await supabase.storage.from(bucket).remove([doc.file_path]);if(result.error)throw result.error;const {error}=await supabase.from("nutrition_documents").delete().eq("id",doc.id).eq("plan_id",planId);if(error)throw new Error("Archivo eliminado, pero no se pudo borrar su registro. Reintenta: "+error.message);await load();}catch(e){setError((e as Error).message||"No se pudo eliminar.");}finally{setBusy(false);}
 }
 return <section style={{background:"white",border:"1px solid #E5EAE5",borderRadius:20,padding:18,margin:"16px 0",color:"#25382F",fontFamily:"inherit"}}>
  <h3 style={{fontSize:16,margin:"0 0 5px",fontWeight:600}}>Documentos originales</h3>
  <p style={{fontSize:12,color:"#7C8980",margin:"0 0 16px"}}>Archivos privados de tu nutricionista.</p>
  {error&&<p role="alert" style={{fontSize:12,color:"#B45353"}}>{error}</p>}
  {loading?<p style={{fontSize:12}}>Cargando documentos...</p>:docs.length===0?<p style={{fontSize:12,color:"#7C8980"}}>Todavía no hay documentos adjuntos.</p>:docs.map(doc=><div key={doc.id} style={{borderBottom:"1px solid #E5EAE5",padding:"12px 0"}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{background:"#EEF2EE",padding:10,borderRadius:12,color:green,display:"flex"}}><FileText size={22}/></span><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,overflowWrap:"anywhere"}}>{doc.file_name}</div><div style={{fontSize:11,color:"#7C8980",marginTop:4}}>{categories[doc.document_type as keyof typeof categories]||"Otros documentos"}</div></div></div><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}><button type="button" style={button} disabled={busy} onClick={()=>void open(doc)}><Eye size={16}/> Ver</button><button type="button" style={button} disabled={busy} onClick={()=>void open(doc,true)}><Download size={16}/> Descargar</button><button type="button" style={{...button,color:"#B45353"}} disabled={busy} onClick={()=>void remove(doc)} aria-label={`Eliminar ${doc.file_name}`}><Trash2 size={16}/></button></div></div>)}
  <label style={{display:"block",fontSize:12,fontWeight:500,marginTop:18}}>Categoría del documento<select value={category} disabled={busy} onChange={e=>setCategory(e.target.value as keyof typeof categories)} style={{display:"block",width:"100%",boxSizing:"border-box",margin:"7px 0 12px",padding:12,border:"1px solid #E5EAE5",borderRadius:12,background:"white",fontFamily:"inherit",color:"#25382F",fontSize:13}}>{Object.entries(categories).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
  <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);}}/>
  <button type="button" disabled={busy||loading} onClick={()=>input.current?.click()} style={{...button,width:"100%",minHeight:85,border:"1px dashed #AAB8AE",flexDirection:"column",opacity:busy ? 0.6 : 1}}><Upload size={23}/>{busy?"Procesando...":"Adjuntar documento PDF"}<span style={{fontSize:10,fontWeight:400}}>Máximo 10 MB por archivo</span></button>
 </section>;
}
