#!/usr/bin/env node
/**
 * Visual + layout check across every public page, desktop and mobile.
 *
 * Exists because two real bugs shipped past `astro check` and past curling the
 * HTML: a stray `)}` rendering as text, and a ghost button drawn ink-on-ink
 * over the dark hero. Both were present and correct in the markup — only
 * looking at the rendered page finds them.
 *
 * Checks per page: HTTP status, horizontal overflow (with the offending
 * elements named), buttons whose text matches their own background, and
 * console/page errors. Screenshots land in /tmp/shots.
 *
 *   npm run shots
 *
 * Needs a dev server on :4321 and `npx playwright install chromium`.
 */

import { chromium } from 'playwright';

const BASE='http://localhost:4321';
const pages=['/','/cars','/cars/volkswagen-touareg','/reservation','/faq','/bs','/bs/vozila'];
const sizes=[{n:'d',w:1440,h:950,m:false},{n:'m',w:390,h:844,m:true}];
const b=await chromium.launch();
let bad=0;
for(const s of sizes){
  const c=await b.newContext({viewport:{width:s.w,height:s.h},deviceScaleFactor:1,isMobile:s.m,hasTouch:s.m});
  for(const u of pages){
    const p=await c.newPage();
    const errs=[];
    p.on('pageerror',e=>errs.push(String(e).slice(0,80)));
    p.on('console',m=>m.type()==='error'&&errs.push(m.text().slice(0,80)));
    const r=await p.goto(BASE+u,{waitUntil:'networkidle'});
    const o=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,
      offenders:[...document.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>document.documentElement.clientWidth+1).slice(0,3).map(e=>e.tagName.toLowerCase()+'.'+String(e.className).split(' ')[0])}));
    // any text with poor contrast against its own background is the class of bug that bit us twice
    const invisible=await p.evaluate(()=>[...document.querySelectorAll('a.btn,button.btn')].filter(el=>{
      const cs=getComputedStyle(el); return cs.color===cs.backgroundColor && cs.borderColor===cs.backgroundColor;
    }).map(el=>el.textContent.trim().slice(0,24)));
    const ov=o.sw>o.cw;
    if(ov||errs.length||invisible.length) bad++;
    console.log(`${s.n} ${u.padEnd(30)} ${r.status()} ${ov?'⚠OVERFLOW '+o.offenders.join(','):'ok'}${invisible.length?' ⚠INVISIBLE-BTN '+invisible.join(','):''}${errs.length?' ⚠JS '+errs[0]:''}`);
    await p.screenshot({path:`/tmp/shots/${s.n}${u.replace(/\//g,'_')}.png`,fullPage:false});
    await p.close();
  }
  await c.close();
}
await b.close();
console.log(bad===0?'\nALL CLEAN':`\n${bad} page(s) with issues`);
