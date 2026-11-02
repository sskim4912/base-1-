export const voucherFields={vendor:'거래처',date:'날짜',description:'적요',supplyAmount:'공급가액',taxAmount:'세액',totalAmount:'합계'};
export async function seleniumRequest(env,path,fields){
  if(!env.SELENIUM_RUNNER_URL||!env.SELENIUM_RUNNER_TOKEN)throw new Error('Selenium 실행 서버를 연결하세요. SELENIUM_RUNNER_URL과 서버 연결용 Secret 설정이 필요합니다.');
  const base=new URL(env.SELENIUM_RUNNER_URL);
  if(base.protocol!=='https:'||base.username||base.password)throw new Error('Selenium 실행 서버는 인증 정보 없는 HTTPS 주소로 설정하세요.');
  const response=await fetch(new URL(path,base.origin),{method:fields?'POST':'GET',headers:{Authorization:'Bearer '+env.SELENIUM_RUNNER_TOKEN,...(fields?{'Content-Type':'application/json'}:{})},...(fields?{body:JSON.stringify({fields})}:{}),redirect:'error',signal:AbortSignal.timeout(60000)});
  let data;try{data=await response.json();}catch{throw new Error('Selenium 실행 서버의 응답이 올바르지 않습니다.');}
  if(!response.ok||!data.ok)throw new Error(data.message||'Selenium 실행 서버 오류');
  // Only return known status data, never runner config, credentials or page content.
  return fields?{filled:data.filled,submitted:false,message:data.message}:{connected:true,busy:!!data.busy,mode:data.mode,message:'Selenium 실행 서버 연결 성공'};
}
export function validateVoucher(fields){
  if(!fields||typeof fields!=='object'||Array.isArray(fields))throw new Error('전표 입력값이 필요합니다.');
  const result={};
  for(const [key,value]of Object.entries(fields)){
    if(!Object.hasOwn(voucherFields,key)||typeof value!=='string'||value.length>2000)throw new Error('올바르지 않은 전표 입력값입니다.');
    if(value.trim())result[key]=value.trim();
  }
  if(!Object.keys(result).length)throw new Error('최소 한 항목을 입력하세요.');
  return result;
}
export const demoPage=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Selenium 테스트 전표</title><style>body{font:16px system-ui;max-width:700px;margin:50px auto;padding:20px}label{display:block;margin:15px 0}input{display:block;padding:10px;width:95%}</style><h1>Selenium 테스트 전표</h1><p>연결 테스트 화면입니다. 실제 전표를 저장하지 않습니다.</p><form id="voucher-form" onsubmit="return false">${Object.entries(voucherFields).map(([key,label])=>'<label>'+label+'<input id="'+key+'" name="'+key+'" autocomplete="off"></label>').join('')}</form>`;
