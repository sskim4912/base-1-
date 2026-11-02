import {Builder,By,until} from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
export const FIELD_NAMES=['vendor','date','description','supplyAmount','taxAmount','totalAmount'];
export function validateFields(fields){
  if(!fields || typeof fields!=='object' || Array.isArray(fields))throw new Error('전표 입력값이 필요합니다.');
  const result={};
  for(const [name,value] of Object.entries(fields)){
    if(!FIELD_NAMES.includes(name)||typeof value!=='string'||value.length>2000)throw new Error('잘못된 전표 입력값: '+name);
    if(value.trim())result[name]=value.trim();
  }
  if(!Object.keys(result).length)throw new Error('최소 한 항목을 입력하세요.');
  return result;
}
export function validateConfig(config){
  const url=new URL(config.targetUrl);
  if(!['http:','https:'].includes(url.protocol))throw new Error('관리자 화면 URL은 HTTP(S)여야 합니다.');
  if(!config.readySelector||!config.fields||typeof config.fields!=='object')throw new Error('입력 화면 셀렉터를 설정하세요.');
  return config;
}
export async function fillVoucher(config,fields,options={}){
  validateConfig(config);fields=validateFields(fields);
  for(const name of Object.keys(fields))if(!config.fields[name])throw new Error('입력칸 셀렉터 누락: '+name);
  const chromeOptions=new chrome.Options();
  if(options.headless!==false)chromeOptions.addArguments('--headless=new');
  chromeOptions.addArguments('--disable-dev-shm-usage','--window-size=1440,1000');
  if(process.env.CHROME_NO_SANDBOX==='true')chromeOptions.addArguments('--no-sandbox');
  if(process.env.CHROME_BINARY)chromeOptions.setChromeBinaryPath(process.env.CHROME_BINARY);
  if(options.profileDir)chromeOptions.addArguments('--user-data-dir='+options.profileDir);
  const builder=new Builder().forBrowser('chrome').setChromeOptions(chromeOptions);
  if(process.env.CHROMEDRIVER_PATH)builder.setChromeService(new chrome.ServiceBuilder(process.env.CHROMEDRIVER_PATH));
  const driver=await builder.build();let retained=false;
  try{
    await driver.manage().setTimeouts({pageLoad:30000,script:15000});
    await driver.get(config.targetUrl);
    await driver.wait(until.elementLocated(By.css(config.readySelector)),config.timeoutMs||15000);
    const filled=[];
    for(const [name,value] of Object.entries(fields)){
      const element=await driver.wait(until.elementLocated(By.css(config.fields[name])),config.timeoutMs||15000);
      await driver.wait(until.elementIsVisible(element),config.timeoutMs||15000);await driver.wait(until.elementIsEnabled(element),config.timeoutMs||15000);
      await element.clear();await element.sendKeys(value);
      // Blur triggers validation and common frontend change handlers.
      await driver.executeScript('arguments[0].blur()',element);
      const actual=await element.getAttribute('value');
      if(actual!==value)throw new Error('입력값 검증 실패: '+name);
      filled.push(name);
    }
    const result={filled,submitted:false,message:'입력값을 채우고 확인했습니다. 최종 저장은 실행하지 않았습니다.'};
    if(options.headless===false){retained=true;result.message+=' 열린 브라우저에서 내용을 확인하세요.';result.close=()=>driver.quit();}
    return result;
  }finally{if(!retained)await driver.quit();}
}
