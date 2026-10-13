import {authorized,json,sameOrigin,privateHeaders,type AdminEnv} from "../../../admin/security";
import {products} from "../../../catalog";
const nameById=new Map(products.map(p=>[p.id,p.name]));
function decode(row:any) { return {...row,items:JSON.parse(row.items).map((i:any)=>({...i,name:nameById.get(i.id)||i.id})),attachments:JSON.parse(row.attachments).map((a:any,index:number)=>({name:a.name,type:a.type,index}))}; }
function csvCell(value:unknown) { let text=String(value??"");if(/^[\t\r\n]|^\s*[=+@-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"'; }
export async function GET(request: Request) {
  try {
    const {env:bindings}=await import("cloudflare:workers");const env=bindings as unknown as AdminEnv;
    if(!await authorized(request,env))return json({error:"请先登录"},401);
    const params=new URL(request.url).searchParams;const status=params.get("status")||"all",q=(params.get("q")||"").trim().slice(0,100);
    const where:string[]=[],args:unknown[]=[];
    if(["new","done"].includes(status)){where.push("status = ?");args.push(status);}
    if(q){where.push("(name LIKE ? ESCAPE '\\' OR contact LIKE ? ESCAPE '\\' OR message LIKE ? ESCAPE '\\')");const term='%'+q.replace(/[\\%_]/g,"\\$&")+'%';args.push(term,term,term);}
    const clause=where.length?' WHERE '+where.join(' AND '):'';
    const total=await env.DB.prepare('SELECT COUNT(*) AS count FROM inquiries'+clause).bind(...args).first();
    const exporting=params.get("export")==="csv";
    if(exporting&&total.count>10000)return json({error:"记录超过一万条，请先筛选后导出"},400);
    const page=Math.max(1,Math.min(100000,Number(params.get("page"))||1));
    const result=await env.DB.prepare('SELECT * FROM inquiries'+clause+' ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?').bind(...args,exporting?10000:30,exporting?0:(page-1)*30).all();
    const rows=result.results.map(decode);
    if(exporting){const data=[['编号','提交时间','状态','称呼','联系方式','留言','采购清单','附件名称'],...rows.map((r:any)=>[r.id,new Date(r.created_at).toISOString(),r.status==='done'?'已处理':'未处理',r.name,r.contact,r.message,r.items.map((i:any)=>`${i.name} x ${i.quantity}`).join('; '),r.attachments.map((a:any)=>a.name).join('; ')])];return new Response('\uFEFF'+data.map(row=>row.map(csvCell).join(',')).join('\r\n'),{headers:{...privateHeaders,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="mir-camping-inquiries.csv"'}});}
    const unread=await env.DB.prepare("SELECT COUNT(*) AS count FROM inquiries WHERE status='new'").first();
    return json({rows,total:total.count,unread:unread.count,page});
  } catch {return json({error:"读取留言失败，请稍后重试"},503);}
}
export async function PATCH(request: Request) {
  if(!sameOrigin(request))return json({error:"请求来源无效"},403);
  if(!request.headers.get("content-type")?.startsWith("application/json"))return json({error:"请求格式无效"},400);
  try {const {env:bindings}=await import("cloudflare:workers");const env=bindings as unknown as AdminEnv;if(!await authorized(request,env))return json({error:"请先登录"},401);const body=await request.text();if(body.length>512)return json({error:"请求过大"},413);const {id,status}=JSON.parse(body);if(typeof id!=="string"||id.length>64||!["new","done"].includes(status))return json({error:"参数无效"},400);const result=await env.DB.prepare("UPDATE inquiries SET status=? WHERE id=?").bind(status,id).run();return result.meta.changes?json({ok:true}):json({error:"留言不存在"},404);}catch{return json({error:"状态保存失败"},503);}
}
