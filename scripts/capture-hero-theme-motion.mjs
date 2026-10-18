import {chromium} from 'playwright';
import { browserOptions, baseUrl as siteUrl } from './browser-config.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const browser=await chromium.launch(browserOptions);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kitee-theme-'));
fs.mkdirSync('artifacts/hero-theme', {recursive:true});
try {
 const page=await browser.newPage({viewport:{width:1280,height:1300}});
 await page.addInitScript(()=>sessionStorage.setItem('kitee-aquarium-demo-v1.3','done'));
 await page.goto(siteUrl + '/zh-Hans/hero-p0');await page.locator('[data-ready="true"]').waitFor();
 await page.waitForTimeout(30000);
 const perf=await page.evaluate(()=>{const a=document.querySelector('[data-aquarium-p0]').aquariumP0,s=a.stats(),gl=a.fluidCanvas().getContext('webgl2');const describe=a=>{const b=[...a].sort((x,y)=>x-y);return {samples:b.length,mean:b.reduce((x,y)=>x+y,0)/b.length,p95:b[Math.floor(b.length*.95)]}};return {fish:a.snapshot().fish.length,intervals:describe(s.intervals),draw:describe(s.drawMs),gpu:gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL),quality:s.quality}});
 fs.writeFileSync('artifacts/hero-theme/performance.json',JSON.stringify(perf,null,2));
 const cdp=await page.context().newCDPSession(page),frames=[];
 cdp.on('Page.screencastFrame',e=>{const file=path.join(dir,`${frames.length}.jpg`);fs.writeFileSync(file,Buffer.from(e.data,'base64'));frames.push({file,t:e.metadata.timestamp});cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(()=>{});});
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:85,maxWidth:960,maxHeight:1000,everyNthFrame:5});
 await page.waitForTimeout(5000);
 await page.getByRole('button',{name:'蜂群图',exact:true}).click();await page.waitForTimeout(3500);
 await page.getByRole('button',{name:'自由鱼群',exact:true}).click();await page.locator('[data-toy="react"]').click();await page.waitForTimeout(5000);
 await cdp.send('Page.stopScreencast');
 fs.writeFileSync(path.join(dir,'frames.txt'),frames.map((f,i)=>`file '${f.file}'\nduration ${i+1<frames.length?Math.max(.01,frames[i+1].t-f.t):.1}`).join('\n'));
 execFileSync('ffmpeg',['-y','-f','concat','-safe','0','-i',path.join(dir,'frames.txt'),'-vf','scale=trunc(iw/2)*2:trunc(ih/2)*2','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','artifacts/hero-theme/swim-and-modes.mp4'],{stdio:'ignore'});
 console.log(perf);
}finally{await browser.close();fs.rmSync(dir,{recursive:true,force:true});}
