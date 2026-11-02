import test from 'node:test';import assert from 'node:assert/strict';
import {seleniumRequest,validateVoucher} from '../src/selenium.js';import worker from '../src/worker.js';
test('runner connection is explicit and does not accept target URLs from users',async()=>{
  await assert.rejects(seleniumRequest({},'/fill',{vendor:'A'}),/실행 서버/);
  assert.throws(()=>validateVoucher({targetUrl:'https://other.com'}));
  const original=globalThis.fetch;
  globalThis.fetch=async(url,options)=>{assert.equal(url.href,'https://runner.example/fill');assert.equal(options.headers.Authorization,'Bearer mock');assert.deepEqual(JSON.parse(options.body),{fields:{vendor:'A'}});return Response.json({ok:true,filled:['vendor'],submitted:false,message:'filled',secret:'do-not-return'});};
  try{const result=await seleniumRequest({SELENIUM_RUNNER_URL:'https://runner.example',SELENIUM_RUNNER_TOKEN:'mock'},'/fill',{vendor:'A'});assert.deepEqual(result.filled,['vendor']);assert.equal(result.submitted,false);assert.equal(result.secret,undefined);}finally{globalThis.fetch=original;}
});
test('unconfigured Worker reports status and serves demo without pretending live connection',async()=>{
 const status=await(await worker.fetch(new Request('https://example.com/api/selenium/status'),{})).json();assert.equal(status.connected,false);
 const demo=await worker.fetch(new Request('https://example.com/selenium-demo'),{});assert.equal(demo.status,200);assert.match(await demo.text(),/id="vendor"/);
 const invalid=await worker.fetch(new Request('https://example.com/api/selenium/fill',{method:'POST',body:JSON.stringify({fields:{targetUrl:'arbitrary'}})}),{});assert.equal(invalid.status,400);
});
