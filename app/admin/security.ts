type Database = { prepare: (sql: string) => any };
export type AdminEnv = { DB: Database; BUCKET: any; ADMIN_PASSWORD_HASH?: string };
const cookieName = "mir_admin_session";
export const privateHeaders = { "Cache-Control":"no-store, private", "X-Content-Type-Options":"nosniff" };
export function json(data: unknown, status=200) { return Response.json(data,{status,headers:privateHeaders}); }
export function sameOrigin(request: Request) { return request.headers.get("origin") === new URL(request.url).origin; }
export async function limitedText(request: Request, limit: number) {
  const reader=request.body?.getReader();if(!reader)return "";
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();return null;}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return new TextDecoder().decode(bytes);
}
export async function hash(value: string) { return [...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,"0")).join(""); }
export async function verifyPassword(password: string, stored: string) {
  const [salt,expected]=stored.split(":");
  if(!salt || !/^[a-f0-9]{64}$/.test(expected || ""))return false;
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
  const result=await crypto.subtle.deriveBits({name:"PBKDF2",salt:new TextEncoder().encode(salt),iterations:100000,hash:"SHA-256"},key,256);
  const actual=[...new Uint8Array(result)].map(b=>b.toString(16).padStart(2,"0")).join("");
  let diff=0;for(let i=0;i<expected.length;i++)diff|=expected.charCodeAt(i)^actual.charCodeAt(i);return diff===0;
}
export function sessionCookie(request: Request, token: string, maxAge: number) {
  return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
export function getToken(request: Request) { return request.headers.get("cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith(cookieName+"="))?.slice(cookieName.length+1) || ""; }
export async function authorized(request: Request, env: AdminEnv) {
  if(!env.ADMIN_PASSWORD_HASH)return false;
  const token=getToken(request);if(!/^[a-f0-9]{64}$/.test(token))return false;
  const session=await env.DB.prepare("SELECT expires_at FROM admin_sessions WHERE token_hash = ? AND expires_at > ?").bind(await hash(token),Date.now()).first();
  return Boolean(session);
}
