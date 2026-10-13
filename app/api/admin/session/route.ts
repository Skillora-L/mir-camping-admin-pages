import { authorized, getToken, hash, json, limitedText, privateHeaders, sameOrigin, sessionCookie, verifyPassword, type AdminEnv } from "../../../admin/security";
async function bindings() { const {env}=await import("cloudflare:workers");return env as unknown as AdminEnv; }
export async function GET(request: Request) {
  try { return json({authenticated:await authorized(request,await bindings())}); } catch { return json({error:"后台暂不可用，请稍后重试"},503); }
}
export async function POST(request: Request) {
  if(!sameOrigin(request))return json({error:"请求来源无效"},403);
  if(!request.headers.get("content-type")?.startsWith("application/json"))return json({error:"请求格式无效"},400);
  try {
    const env=await bindings();if(!env.ADMIN_PASSWORD_HASH)return json({error:"管理员密码尚未配置，请先完成安全设置"},503);
    const body=await limitedText(request,2048);if(body===null)return json({error:"请求过大"},413);
    const {password}=JSON.parse(body);if(typeof password!=="string"||password.length>256)return json({error:"请输入密码"},400);
    const key=await hash(request.headers.get("cf-connecting-ip") || "local");const now=Date.now();
    // Atomic per-IP window increment prevents parallel attempts bypassing the limit.
    const attempt=await env.DB.prepare("INSERT INTO admin_attempts (key,count,window_start) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count = CASE WHEN window_start < ? THEN 1 ELSE count+1 END, window_start = CASE WHEN window_start < ? THEN excluded.window_start ELSE window_start END RETURNING count").bind(key,now,now-900000,now-900000).first();
    if(attempt.count>10)return json({error:"尝试次数过多，请15分钟后再试"},429);
    if(!await verifyPassword(password,env.ADMIN_PASSWORD_HASH))return json({error:"密码不正确"},401);
    const token=[...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,"0")).join("");
    await env.DB.prepare("INSERT INTO admin_sessions (token_hash,expires_at) VALUES (?,?)").bind(await hash(token),now+8*3600000).run();
    return Response.json({ok:true},{headers:{...privateHeaders,"Set-Cookie":sessionCookie(request,token,8*3600)}});
  } catch { return json({error:"暂时无法登录，请稍后重试"},503); }
}
export async function DELETE(request: Request) {
  if(!sameOrigin(request))return json({error:"请求来源无效"},403);
  try {const env=await bindings();await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(await hash(getToken(request))).run();return Response.json({ok:true},{headers:{...privateHeaders,"Set-Cookie":sessionCookie(request,"",0)}});}catch{return json({error:"退出失败，请重试"},503);}
}
