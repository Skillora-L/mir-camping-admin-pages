import {authorized,json,privateHeaders,type AdminEnv} from "../../../admin/security";
export async function GET(request: Request) {
  try {
    const {env:bindings}=await import("cloudflare:workers");const env=bindings as unknown as AdminEnv;
    if(!await authorized(request,env))return json({error:"请先登录"},401);
    const params=new URL(request.url).searchParams,id=params.get("id"),index=Number(params.get("index"));
    if(!id||!Number.isInteger(index)||index<0||index>2)return json({error:"附件不存在"},404);
    const record=await env.DB.prepare("SELECT attachments FROM inquiries WHERE id=?").bind(id).first();
    const attachment=record&&JSON.parse(record.attachments)[index];if(!attachment)return json({error:"附件不存在"},404);
    const object=await env.BUCKET.get(attachment.key);if(!object)return json({error:"附件不存在"},404);
    return new Response(object.body,{headers:{...privateHeaders,"Content-Type":attachment.type,"Content-Disposition":`attachment; filename="reference-image"; filename*=UTF-8''${encodeURIComponent(attachment.name).replace(/'/g,'%27')}`}});
  }catch{return json({error:"附件下载失败"},503);}
}
