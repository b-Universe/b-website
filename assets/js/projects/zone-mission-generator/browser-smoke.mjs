import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const [chrome, base = 'http://127.0.0.1:8000', mode = 'canvas', screenshot] = process.argv.slice(2);
assert.ok(chrome, 'Pass the Chromium executable, local site URL, and canvas or webgl mode');
assert.ok(['canvas', 'webgl'].includes(mode), 'Choose canvas or webgl mode');
const profile = await mkdtemp(join(tmpdir(), 'zone-mission-browser-'));
const browser = spawn(chrome, [
  '--headless', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0',
  '--enable-unsafe-swiftshader', '--window-size=1440,960', `--user-data-dir=${profile}`,
  ...(mode === 'canvas' ? ['--host-resolver-rules=MAP cdn.jsdelivr.net ~NOTFOUND'] : []),
  'about:blank',
], { stdio: 'ignore', windowsHide: true });
const exited = new Promise(resolveExit => {
  browser.once('exit', resolveExit);
  browser.once('error', resolveExit);
});

async function until(action, label, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = await action();
    if (value) return value;
    await delay(100);
  }
  throw Error(label);
}

let socket;
try {
  const [port] = await until(async () => {
    const config = await readFile(join(profile, 'DevToolsActivePort'), 'utf8').catch(() => '');
    return config && config.split('\n');
  }, 'Chrome did not enable DevTools');
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  const pending = new Map(), errors = [];
  let nextId = 0;
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') {
      const { exception, text, url, lineNumber } = message.params.exceptionDetails;
      errors.push(exception?.description || `${text} (${url}:${lineNumber})`);
    }
    if (message.id) {
      pending.get(message.id)?.(message);
      pending.delete(message.id);
    }
  });
  const call = (method, params = {}) => new Promise(resolve => {
    const id = ++nextId;
    pending.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression, userGesture = false) => {
    const { result, error } = await call('Runtime.evaluate', { expression, userGesture, returnByValue: true, awaitPromise: true });
    if (error || result.exceptionDetails) throw Error(result?.exceptionDetails?.exception?.description || error?.message);
    return result.result.value;
  };
  await call('Runtime.enable');
  await call('Page.navigate', { url: new URL('/projects/zone-mission-generator.html', base).href });
  await until(() => evaluate(`(()=>{
    const failure=document.querySelector('#render-error:not(.hidden)');
    if(failure)throw Error(failure.textContent);
    return Boolean(window.BZoneMissionStudio);
  })()`), 'Mission studio did not initialize', 40000);
  assert.equal(await evaluate("document.querySelector('#btn-export-glb').disabled"), mode === 'canvas');
  const result = await evaluate(`(async()=>{
    const studio=window.BZoneMissionStudio;
    const find=id=>document.getElementById(id);
    const initial=studio.getMission();
    if(initial.segments.length!==1||initial.generator.version!=='4.0.0')throw Error('Expanded defaults were not loaded');
    const generationStart=performance.now();
    find('cfg-scale').value='massive';
    find('cfg-rooms').value='72';
    find('btn-generate').click();
    const buildMs=performance.now()-generationStart;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const officeFrameMs=performance.now()-generationStart;
    if(!studio.getMission().validation.ok)throw Error('Massive office is invalid');
    const plan=find('floorplan'), fitted=plan.getAttribute('viewBox');
    find('plan-zoom-in').click();
    if(plan.getAttribute('viewBox')===fitted)throw Error('Floorplan zoom did not change the view');
    find('plan-fit').click();
    find('floorplan').querySelector('[data-room]').dispatchEvent(new MouseEvent('click',{bubbles:true}));
    if(find('btn-focus').disabled)throw Error('Floorplan room selection did not reach camera controls');
    find('btn-focus').click();
    find('btn-iso').click();
    const normalHeight=find('scene-frame').getBoundingClientRect().height;
    find('btn-theatre').click();
    if(find('btn-theatre').getAttribute('aria-pressed')!=='true')throw Error('Theatre did not open');
    if(find('scene-frame').getBoundingClientRect().height<=normalHeight)throw Error('Theatre did not expand the canvas');
    find('btn-theatre').click();
    return {buildMs,officeFrameMs,rooms:studio.getMission().segments[0].rooms.length};
  })()`, true);
  await call('Page.bringToFront');
  await evaluate("document.querySelector('#btn-fullscreen').click()", true);
  await until(() => evaluate("document.fullscreenElement?.id==='mission-workspace'"), 'Fullscreen did not open');
  await evaluate("document.querySelector('#btn-fullscreen').click()", true);
  await until(() => evaluate('document.fullscreenElement===null'), 'Fullscreen did not exit');

  const artifacts = await evaluate(`(async()=>{
    const studio=window.BZoneMissionStudio;
    const find=id=>document.getElementById(id);
    const anchorClick=HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click=function(){window.missionDownload=fetch(this.href).then(response=>response.blob())};
    try{
      find('btn-export-json').click();
      const mission=JSON.parse(await (await window.missionDownload).text());
      if(mission.schemaVersion!=='b.zone-mission.v1'||!mission.segments[0].architecture)throw Error('Architecture JSON export is missing');
      let glbBytes=0;
      if(!find('btn-export-glb').disabled){
        window.missionDownload=null;
        find('btn-export-glb').click();
        for(let attempt=0;!window.missionDownload&&attempt<100;attempt++)await new Promise(r=>setTimeout(r,100));
        if(!window.missionDownload)throw Error('GLB download did not start');
        const buffer=await (await window.missionDownload).arrayBuffer();
        if(new DataView(buffer).getUint32(0,true)!==0x46546c67)throw Error('Invalid GLB header');
        glbBytes=buffer.byteLength;
      }
      find('cfg-floors').value='3';
      find('btn-generate').click();
      const previous=studio.getMission();
      find('btn-reroll-segment').click();
      const reroll=studio.getMission();
      if(JSON.stringify(previous.segments[0])===JSON.stringify(reroll.segments[0]))throw Error('Active segment did not reroll');
      if(JSON.stringify(previous.segments[1])!==JSON.stringify(reroll.segments[1]))throw Error('Reroll modified an inactive segment');
      if(!reroll.validation.ok)throw Error('Rerolled mission failed validation');
      const cavePreset=[...find('scenario-preset').options].find(option=>option.text==='Massive Underground Caverns');
      find('scenario-preset').value=cavePreset.value;
      const caveStart=performance.now();
      find('scenario-preset').dispatchEvent(new Event('change'));
      const caveBuildMs=performance.now()-caveStart,cave=studio.getMission();
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const caveFrameMs=performance.now()-caveStart;
      if(cave.archetype!=='cave'||!cave.validation.ok)throw Error('Massive cave preset failed');
      const terrain=cave.segments[0].terrain;
      if(!terrain?.ceiling.indices.length||terrain.stats.elevationMax-terrain.stats.elevationMin<5)throw Error('Cave terrain payload is incomplete');
      find('toggle-wireframe').click();
      find('toggle-grade').click();
      find('toggle-ceilings').click();
      find('toggle-ceilings').click();
      if(find('wireframe-control').hidden||find('grade-control').hidden)throw Error('Cave diagnostics are unavailable');
      let caveGlbBytes=0;
      if(!find('btn-export-glb').disabled){
        window.missionDownload=null;
        find('btn-export-glb').click();
        for(let attempt=0;!window.missionDownload&&attempt<100;attempt++)await new Promise(r=>setTimeout(r,100));
        if(!window.missionDownload)throw Error('Cave GLB download did not start');
        const buffer=await (await window.missionDownload).arrayBuffer();
        const jsonLength=new DataView(buffer).getUint32(12,true);
        const gltf=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,jsonLength)));
        for(const name of ['Cave floor','Cave walls','Cave ceiling'])if(!gltf.nodes.some(node=>node.name===name))throw Error('Missing GLB surface: '+name);
        caveGlbBytes=buffer.byteLength;
      }
      find('toggle-wireframe').click();
      find('toggle-grade').click();
      find('btn-test-start').click();
      const caveStartPosition=studio.getStatus().position;
      find('walk-camera').click();
      window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyD',bubbles:true}));
      await new Promise(resolve=>setTimeout(resolve,450));
      window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyD',bubbles:true}));
      const position=studio.getStatus().position;
      const {sampleTerrain}=await import('/assets/js/projects/zone-mission-generator/cave-terrain.js');
      if(position.x<=caveStartPosition.x||Math.abs(position.y-caveStartPosition.y)<.0001||
         Math.abs(sampleTerrain(terrain,position).y-position.y)>.001)throw Error('Cave walkthrough did not follow the floor triangles');
      find('btn-test-stop').click();
      const legacy=await (await fetch('/assets/js/projects/zone-mission-generator/examples/corporate-office-takeover.mission.json')).text();
      const dt=new DataTransfer();
      dt.items.add(new File([legacy],'legacy.json',{type:'application/json'}));
      find('json-file').files=dt.files;
      find('json-file').dispatchEvent(new Event('change'));
      for(let attempt=0;studio.getMission().generator.version!=='0.8.0'&&attempt<40;attempt++)await new Promise(r=>setTimeout(r,100));
      if(studio.getMission().generator.version!=='0.8.0'||!studio.getMission().validation.ok)throw Error('Legacy file import failed');
      find('btn-test-start').click();
      if(!studio.getStatus().test)throw Error('Walkthrough did not start');
      const before=Number(find('plan-player').getAttribute('cx'));
      window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyD',bubbles:true}));
      await new Promise(resolve=>setTimeout(resolve,400));
      window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyD',bubbles:true}));
      if(Number(find('plan-player').getAttribute('cx'))<=before)throw Error('Walkthrough movement did not update the floor plan');
      find('btn-test-stop').click();
      return {glbBytes,caveGlbBytes,legacyImport:true,caveRooms:cave.segments[0].rooms.length,caveTriangles:terrain.stats.triangles,caveBuildMs,caveFrameMs};
    }finally{HTMLAnchorElement.prototype.click=anchorClick}
  })()`);
  if (screenshot) {
    await evaluate(`(()=>{
      const scenarios=document.querySelector('#scenario-preset');
      scenarios.value=[...scenarios.options].find(option=>option.text==='Vast Limestone Cave').value;
      scenarios.dispatchEvent(new Event('change'));
      document.querySelector('#btn-theatre').click();
    })()`);
    await delay(400);
    await evaluate("document.querySelector('#btn-fit').click(); document.querySelector('#scene-tooltip').classList.remove('active')");
    await delay(350);
    const clip = await evaluate(`(()=>{
      const {x,y,width,height}=document.querySelector('#scene-frame').getBoundingClientRect();
      return {x,y,width,height,scale:1};
    })()`);
    const { result } = await call('Page.captureScreenshot', { format: 'png', clip });
    await writeFile(screenshot, Buffer.from(result.data, 'base64'));
    await evaluate("document.querySelector('#btn-theatre').click()");
  }
  await evaluate(`(()=>{
    const editor=document.querySelector('#story-editor');
    const click=label=>[...editor.querySelectorAll('button')].find(button=>button.textContent===label).click();
    click('Add mission');
    if(editor.querySelector('#story-sequence select').options.length!==2)throw Error('Mission add failed');
    click('Mission settings');
    click('Generate three candidates');
    click('Select map');
    if(!editor.textContent.includes('Selected map'))throw Error('Map attachment failed');
    click('Objectives & events');
    click('Add objective');
    click('Test story');
    click('Test current mission');
    [...editor.querySelectorAll('button')].find(button=>button.textContent.startsWith('New objective · pending')).click();
    if(!editor.textContent.includes('Mission complete'))throw Error('Objective simulation failed');
  })()`);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ mode, ...result, ...artifacts }, null, 2));
} finally {
  socket?.close();
  browser.kill();
  await Promise.race([exited, delay(1000)]);
  if (dirname(resolve(profile)) === resolve(tmpdir()) && basename(profile).startsWith('zone-mission-browser-')) {
    await rm(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }).catch(error => {
      console.warn(`Chrome retained its temporary profile: ${error.message}`);
    });
  }
}
