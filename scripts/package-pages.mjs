import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
const root=process.cwd(),out=path.resolve(root,'pages-dist');
if(path.dirname(out)!==root||path.basename(out)!=='pages-dist')throw Error('Unsafe output directory');
// Only discard this project's reproducible Pages build directory.
await fs.rm(out,{recursive:true,force:true});
await fs.cp(path.join(root,'dist/client'),out,{recursive:true,filter:source=>!path.basename(source).startsWith('.')});
// Vite's Workers redirect must not override the root Pages configuration.
await fs.mkdir(path.join(root,'.wrangler/deploy'),{recursive:true});
await fs.writeFile(path.join(root,'.wrangler/deploy/config.json'),JSON.stringify({configPath:'../../wrangler.json'}));
const worker=path.join(out,'_worker.js');
async function list(dir,prefix=''){
 const result=[];
 for(const e of await fs.readdir(dir,{withFileTypes:true})){
  if(e.name==='_worker.js')continue;
  const rel=prefix+'/'+e.name;
  if(e.isDirectory())result.push(...await list(path.join(dir,e.name),rel));else result.push(rel);
 }
 return result;
}
const assets=await list(out);
const contents=`import app from "./dist/server/index.js";
const assets=new Set(${JSON.stringify(assets)});
export default {async fetch(request,env,ctx){
 const url=new URL(request.url);
 if((request.method==="GET"||request.method==="HEAD")&&assets.has(url.pathname))return env.ASSETS.fetch(request);
 return app.fetch(request,env,ctx);
}};
`;
await build({stdin:{contents,resolveDir:root,sourcefile:'pages-entry.js'},outfile:worker,bundle:true,format:'esm',platform:'neutral',target:'es2022',external:['node:*','cloudflare:*'],minify:true});
await fs.writeFile(path.join(out,'_routes.json'),JSON.stringify({version:1,include:['/*'],exclude:['/assets/*','/banners/*','/products/gallery/*']},null,2));
await fs.writeFile(path.join(out,'404.html'),'<!doctype html><title>Not found</title>');
console.log('Pages package ready: '+out);
