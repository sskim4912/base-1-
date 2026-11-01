import {setupPage} from './setup.js';
import {check} from './checks.js';
import {page} from './page.js';
import {readImage,recognize,saveImage,viewImage} from './images.js';
function status(env){return {project:env.GCP_PROJECT_ID,services:[{id:'vertex',name:'Vertex AI',configuration:`${env.VERTEX_MODEL} / ${env.VERTEX_LOCATION}`},{id:'ocr',name:'Cloud Vision OCR',configuration:'테스트 이미지 문자 인식'},{id:'storage',name:'Cloud Storage',configuration:env.GCS_BUCKET}]};}
export default {
  async fetch(request,env){
    const path=new URL(request.url).pathname;
    const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
    if(request.method==='POST'){
      const origin=request.headers.get('Origin');
      if(origin && origin!==new URL(request.url).origin)return Response.json({ok:false,message:'허용되지 않은 요청 출처'},{status:403,headers});
      const start=Date.now();
      try{
        let result;
        if(path==='/api/ocr'||path==='/api/upload'){
          let image;try{image=await readImage(request);}catch(error){return Response.json({ok:false,message:error.message},{status:400,headers});}
          result=path==='/api/ocr'?await recognize(image,env):await saveImage(image,env);
        }else if(path.startsWith('/api/check/')){
          const service=path.slice('/api/check/'.length);
          if(!['vertex','ocr','storage'].includes(service))return Response.json({ok:false,message:'지원하지 않는 서비스'},{status:404,headers});
          result=await check(service,env);
        }else return Response.json({ok:false,message:'Not found'},{status:404,headers});
        return Response.json({ok:true,...result,durationMs:Date.now()-start},{headers});
      }catch(error){return Response.json({ok:false,message:error.name==='TimeoutError'?'외부 API 응답 시간 초과':error.message,durationMs:Date.now()-start},{status:502,headers});}
    }
    if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{...headers,Allow:'GET, POST'}});
    if(path==='/setup')return new Response(setupPage(env),{headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});
    if(path==='/api/status')return Response.json(status(env),{headers});
    if(path==='/api/image')try{return await viewImage(request,env);}catch{return new Response('이미지 불러오기 실패',{status:502,headers});}
    if(path==='/')return new Response(page,{headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});
    return new Response('Not found',{status:404,headers});
  }
};
