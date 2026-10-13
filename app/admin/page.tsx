import AdminPanel from "./panel";
export const metadata={title:"Mir Camping | 留言管理",robots:{index:false,follow:false}};
export default async function AdminPage(){const {env}=await import("cloudflare:workers");const value=String(env.PUBLIC_SITE_URL||"");let websiteUrl="#";try{const u=new URL(value);if(u.protocol==="https:"||u.hostname==="localhost")websiteUrl=u.origin;}catch{}return <AdminPanel websiteUrl={websiteUrl}/>;}
