import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,sep,extname} from 'node:path';
import {createHandler} from './handler.mjs';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
export function createPreviewServer({fetcher,onError=()=>{},enableImporter=true}={}){
  let handler;
  const server=createServer(async(req,res)=>{
    const origin=`http://127.0.0.1:${server.address().port}`;
    if(req.headers.host!==new URL(origin).host){res.writeHead(403);res.end();return;}
    const path=new URL(req.url,origin).pathname;
    try{
      if(path==='/api/matters'){
        if(!enableImporter){res.writeHead(404);res.end();return;}
        handler ||= createHandler({allowedOrigin:origin,fetcher});
        const controller=new AbortController();res.on('close',()=>{if(!res.writableEnded)controller.abort();});
        const request=new Request(origin+path,{method:req.method,headers:req.headers,signal:controller.signal,...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{})});
        const result=await handler(request);res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));return;
      }
      if(req.method!=='GET'){res.writeHead(405);res.end();return;}
      if(path==='/matters-config.js'&&enableImporter){res.writeHead(200,{'Content-Type':mime['.js'],'Cache-Control':'no-store'});res.end("export const MATTERS_ENDPOINT='/api/matters';");return;}
      const file=resolve(root,'.'+decodeURIComponent(path==='/'?'/index.html':path));
      if(!file.startsWith(root.replace(/[\\/]$/,'')+sep)){res.writeHead(403);res.end();return;}
      let body=await readFile(file);
      // Local preview only: production config and CSP stay closed until approved.
      if(enableImporter&&(path==='/'||path==='/index.html'))body=body.toString('utf8').replace("connect-src 'none'","connect-src 'self'");
      res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);
    }catch(error){onError(error);if(!res.headersSent)res.writeHead(404);res.end();}
  });return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const port=Number(process.env.PORT||8766);
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid PORT');
  createPreviewServer().listen(port,'127.0.0.1',()=>console.log(`Reader preview: http://127.0.0.1:${port}/`));
}
