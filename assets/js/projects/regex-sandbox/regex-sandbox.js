(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const pattern = $('rxPattern'), sample = $('rxText'), replacement = $('rxReplacement');
  const status = $('rxStatus'), highlights = $('rxHighlights'), matchList = $('rxMatchList');
  const replaced = $('rxReplaced'), stats = $('rxStats');
  const MAX_INPUT = 100000, MAX_MATCHES = 500, TIMEOUT = 1500;
  let timer = null, worker = null, watchdog = null, runId = 0, last = null;
  const flags = () => [...document.querySelectorAll('.regex-app [data-flag]')].filter(el=>el.checked).map(el=>el.dataset.flag).join('');
  const esc = (value) => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statusSet = (message, kind='info') => {status.className='status '+kind;status.textContent=message;};
  function invalidate() {runId++;clearTimeout(timer);clearTimeout(watchdog);if(worker){worker.terminate();worker=null;} }
  function clearOutput() {last=null;highlights.textContent='';matchList.textContent='';replaced.textContent='';stats.textContent='0 matches';}
  function schedule(){clearTimeout(timer);timer=setTimeout(evaluate,180);}
  function addTextNode(parent,value){parent.appendChild(document.createTextNode(value));}
  function paint(text,matches){
    highlights.replaceChildren();let cursor=0;
    for(const m of matches){
      if(m.index < cursor || m.index > text.length) continue;
      addTextNode(highlights,text.slice(cursor,m.index));
      if(m.value.length){const mark=document.createElement('mark');mark.textContent=m.value;highlights.appendChild(mark);cursor=m.index+m.value.length;}
      else {const marker=document.createElement('span');marker.className='zero-width';marker.title='Zero-length match';marker.textContent='▏';marker.style.color='var(--rx-accent)';highlights.appendChild(marker);cursor=m.index;}
    }
    addTextNode(highlights,text.slice(cursor));
  }
  function paintMatches(matches) {
    matchList.replaceChildren();
    if (!matches.length){const p=document.createElement('p');p.className='subtext';p.textContent='No matches. Try another pattern or change your flags.';matchList.appendChild(p);return;}
    for (const [i,m] of matches.entries()) {
      const card=document.createElement('div');card.className='match-item';
      const header=document.createElement('div');header.innerHTML=`<strong>Match ${i+1}</strong> <code>${esc(JSON.stringify(m.value))}</code>`;card.appendChild(header);
      const where=document.createElement('span');where.className='meta';where.textContent=`Offset ${m.index} · Length ${m.value.length}`;card.appendChild(where);
      const captured=m.groups.map((value,index)=>[String(index+1),value]).filter(([,value])=>value!==undefined);
      for(const [name,value] of Object.entries(m.named||{})) captured.push([name,value]);
      if(captured.length){const list=document.createElement('ul');for(const [name,value] of captured){const li=document.createElement('li');li.textContent=`Group ${name}: ${JSON.stringify(value)}`;list.appendChild(li);}card.appendChild(list);}
      matchList.appendChild(card);
    }
  }
  function evaluate(){
    invalidate();clearOutput();
    const p=pattern.value,t=sample.value,r=replacement.value,f=flags();
    if(!p){statusSet('Enter a regular expression to see matches.','info');return;}
    if(t.length>MAX_INPUT){statusSet(`Input exceeds ${MAX_INPUT.toLocaleString()} characters. Shorten it before testing.`,'warn');return;}
    if(typeof Worker==='undefined'){statusSet('This browser does not support Web Workers. Use a modern browser.','error');return;}
    const id=runId;
    try {worker=new Worker('/assets/js/projects/regex-sandbox/regex-worker.js');}
    catch(err){statusSet('Could not start the regex worker. Serve the page from your website or a local web server.','error');return;}
    worker.onmessage=({data})=>{
      if(id!==runId || data.id!==id)return;
      clearTimeout(watchdog);worker.terminate();worker=null;
      if(!data.ok){statusSet(`Regex error: ${data.error}`,'error');return;}
      last={pattern:p,flags:f,input:t,replacement:r,...data};
      paint(t,data.matches);paintMatches(data.matches);replaced.textContent=data.replaced;
      stats.textContent=`${data.matches.length}${data.capped?'+' : ''} match${data.matches.length===1?'':'es'}`;
      statusSet(data.capped?`Showing the first ${MAX_MATCHES} matches. Narrow your pattern to see more.`:`Valid expression · ${data.matches.length} match${data.matches.length===1?'':'es'}.`,data.capped?'warn':'ok');
    };
    worker.onerror=()=>{if(id!==runId)return;invalidate();statusSet('Regex worker failed. Try reloading the page from your website.','error');};
    watchdog=setTimeout(()=>{if(id!==runId)return;invalidate();clearOutput();statusSet('Evaluation exceeded 1.5 seconds and was stopped. Try a simpler pattern or shorter sample.','warn');},TIMEOUT);
    worker.postMessage({id,pattern:p,flags:f,text:t,replacement:r,maxMatches:MAX_MATCHES});
    statusSet('Checking expression…','info');
  }
  async function copy(value){
    try{await navigator.clipboard.writeText(value);statusSet('Copied to clipboard.','ok');}
    catch{statusSet('Clipboard access was blocked. Use HTTPS or copy the text manually.','warn');}
  }
  function download(){if(!last){statusSet('Enter a valid expression before exporting.','warn');return;}
    const output={pattern:last.pattern,flags:last.flags,sample:last.input,replacement:last.replacement,matchCount:last.matches.length,limited:last.capped,matches:last.matches,replaced:last.replaced};
    const url=URL.createObjectURL(new Blob([JSON.stringify(output,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='regex-sandbox-results.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const EXAMPLES={
    emails:{pattern:'[\\w.+-]+@[\\w.-]+\\.[A-Za-z]{2,}',text:'Contact behr@example.com or help@server.dev.\nInvalid: bear@localhost',flags:'gi',replacement:'[email]'},
    discord:{pattern:'^[^a-zA-Z0-9]|(.)\\1{4,}',text:'!!!DisplayName\nNormalName\naaaaaName\n·Name',flags:'gm',replacement:'[review]'},
    color:{pattern:'#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\\b',text:'background: #1abacd; color: #fff; border: #Z00;',flags:'g',replacement:'var(--accent)'},
    named:{pattern:'(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})',text:'Released 2026-09-23. Updated 2026-10-01.',flags:'g',replacement:'$<month>/$<day>/$<year>'}
  };
  function loadExample(key){const ex=EXAMPLES[key];if(!ex)return;pattern.value=ex.pattern;sample.value=ex.text;replacement.value=ex.replacement;document.querySelectorAll('.regex-app [data-flag]').forEach(el=>{el.checked=ex.flags.includes(el.dataset.flag);});schedule();}
  for(const control of [pattern,sample,replacement,...document.querySelectorAll('.regex-app [data-flag]')])control.addEventListener('input',schedule);
  $('rxExamples').addEventListener('change',(e)=>{loadExample(e.target.value);e.target.value='';});
  $('rxCopy').addEventListener('click',()=>copy(`/${pattern.value}/${flags()}`));
  $('rxCopyReplacement').addEventListener('click',()=>copy(replaced.textContent));
  $('rxDownload').addEventListener('click',download);
  $('rxClear').addEventListener('click',()=>{pattern.value='';sample.value='';replacement.value='';document.querySelectorAll('.regex-app [data-flag]').forEach(el=>{el.checked=el.dataset.flag==='g';});evaluate();pattern.focus();});
  $('rxRun').addEventListener('click',evaluate);
  // An example is visible on first load so the page is immediately useful.
  loadExample('emails');
})();
