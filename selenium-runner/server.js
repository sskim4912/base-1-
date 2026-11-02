import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {timingSafeEqual} from 'node:crypto';
import {fillVoucher,validateConfig,validateFields} from './automation.js';
const config=validateConfig(JSON.parse(await readFile(process.env.SELENIUM_CONFIG||new URL('./config.example.json',import.meta.url),'utf8')));
const token=process.env.SELENIUM_RUNNER_TOKEN;
if(!token)throw new Error('SELENIUM_RUNNER_TOKEN을 실행 환경에 설정하세요.');
let busy=false,retainedClose=null;
function authorized(value){const a=Buffer.from(value||''),b=Buffer.from('Bearer '+token);return a.length===b.length&&timingSafeEqual(a,b);}
const server=http.createServer(async(req,res)=>{
  const reply=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  if(!authorized(req.headers.authorization))return reply(401,{ok:false,message:'실행 서비스 인증 실패'});
  if(req.url==='/health'&&req.method==='GET')return reply(200,{ok:true,busy,mode:process.env.HEADLESS==='false'?'visible':'headless',targetConfigured:true});
  if(req.url!=='/fill'||req.method!=='POST')return reply(404,{ok:false,message:'Not found'});
  if(busy)return reply(409,{ok:false,message:'다른 입력 작업이 진행 중입니다.'});
  let body='';
  try{for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>20000)return reply(413,{ok:false,message:'요청이 너무 큽니다.'});}}catch{return reply(400,{ok:false,message:'요청 읽기 실패'});}
  let fields;try{fields=validateFields(JSON.parse(body).fields);}catch(error){return reply(400,{ok:false,message:error.message});}
  busy=true;
  try{
    if(retainedClose){await retainedClose();retainedClose=null;}
    const result=await fillVoucher(config,fields,{headless:process.env.HEADLESS!=='false',profileDir:process.env.CHROME_PROFILE_DIR});
    retainedClose=result.close||null;delete result.close;reply(200,{ok:true,...result});
  }catch{reply(502,{ok:false,message:'브라우저 자동 입력에 실패했습니다. 로그인 상태·대상 주소·입력칸 셀렉터를 확인하세요.'});}
  finally{busy=false;}
});
server.listen(Number(process.env.PORT||8090),process.env.HOST||'127.0.0.1',()=>console.log('Selenium runner listening'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{if(retainedClose)await retainedClose().catch(()=>{});server.close(()=>process.exit(0));});
