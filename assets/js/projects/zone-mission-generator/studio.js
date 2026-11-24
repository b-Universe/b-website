import { terrainPosition, terrainBoundary, tunnelPath } from './cave-terrain.js';
import { ARCHETYPE_PRESETS, SCENARIOS } from './presets.js';
import { wallPieces } from './architecture.js';
import { caveBoundary, tunnelPolygon } from './cave-geometry.js';
import {placeRoomAsset,assignRoomNames,populateEncounters,rerollSegment,SCHEMA,VERSION,DEFAULT_CONFIG,ARCHETYPES,BUILTIN_ASSETS,normalizeConfig,generateMission,validateMission,decorateMission,registryFromBlueprints,deepCopy,findNearby,canMove,areaAt,importMission,serializeMission,syncNavigation} from './mission-core.js';
// Render backend is selected asynchronously: WebGL/Three.js when available, Canvas 2.5D otherwise.
let MissionViewport;
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const nf=(v)=>Number(v||0).toLocaleString('en-US');
const SAVE_KEY='b_zone_mission_studio_saved_v1';
const ARCH_ICONS={warehouse:'▧',office:'▦',laboratory:'⚗',precinct:'⬡',hospital:'✚',cave:'◆'};
let config=normalizeConfig(DEFAULT_CONFIG),mission=null,selectedSegmentId='seg-01',selection=null,visualMode='layout',rightPanel='inspect',view=null,catalog=deepCopy(BUILTIN_ASSETS),externalBlueprints=[],test=null;
let toastTimeout=null,dirty=false,showGrid=true;
const cfgKeys=['theme','condition','seed','rooms','floors','branches','loops','locks','clutter','roomVariation','encounterDensity','scale','layout','caveNetwork','openness','targetArea','bayWidth','roomDepth','corridorWidth','ceilingHeight','progression','transitionSecurity','transferKind','teleports','lighting','caveStyle','caveChamberScale','caveTunnelLength','caveTunnelWidth','caveElevation','caveDescent','caveRoughness','caveTriangleSize','caveVault','caveClearance','caveOverhang','caveMaxSlope','caveFormations','caveLandforms','cavePools'];
const percentageKeys=new Set(['clutter','roomVariation','encounterDensity','openness','caveRoughness','caveFormations','caveLandforms']);
const configLabel=(key,value)=>percentageKeys.has(key)?value+'%':value;
function toast(message){const target=$('scene-tooltip');target.textContent=message;target.classList.add('active');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>target.classList.remove('active'),3400)}
function downloadJSON(value,name){const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2500)}
function readConfig(){
 const values=Object.fromEntries(cfgKeys.map(key=>{
  const field=$('cfg-'+key);
  return [key,field.type==='checkbox'?field.checked:field.tagName==='SELECT'?field.value:Number(field.value)];
 }));
 return normalizeConfig({...config,...values});
}
function updateInputs(){
 for(const key of cfgKeys){
  const field=$('cfg-'+key),output=$('v-'+key);
  if(field.type==='checkbox')field.checked=config[key];
  else field.value=config[key];
  if(output)output.textContent=configLabel(key,config[key]);
 }
 const cave=config.archetype==='cave';
 for(const key of ['layout','openness','bayWidth','roomDepth','corridorWidth','locks'])$('cfg-'+key).closest('label').hidden=cave;
 $('cfg-caveNetwork').closest('label').hidden=!cave;
 $('cfg-ceilingHeight').closest('label').hidden=cave;
 $('cave-settings').hidden=!cave;
}
function applyScenario(archetype, overrides={}){
 if(test)stopTest();
 config=normalizeConfig({...DEFAULT_CONFIG,...ARCHETYPE_PRESETS[archetype],...overrides,archetype});
 updateInputs();
 regenerate(true);
}
function renderArchetypes(){const el=$('archetype-cards');el.innerHTML=Object.entries(ARCHETYPES).map(([id,data],i)=>`<button class="archetype-card ${config.archetype===id?'active':''}" data-archetype="${id}" aria-pressed="${config.archetype===id}"><span class="archetype-symbol">${ARCH_ICONS[id]}</span><strong>${esc(data.label)}</strong><span class="archetype-count">0${i+1}</span></button>`).join('');
 el.querySelectorAll('[data-archetype]').forEach(b=>b.addEventListener('click',()=>{$('scenario-preset').value='';applyScenario(b.dataset.archetype);toast(`Loaded ${ARCHETYPES[config.archetype].label} preset`)}));
}
function regenerate(refocus=true){try{if(test)stopTest();config=readConfig();mission=generateMission(config,catalog);selectedSegmentId=mission.segments[0].id;selection=null;dirty=false;renderEverything(refocus);toast(`${mission.segments.length} independent mission segment${mission.segments.length===1?'':'s'} generated`)}catch(e){console.error(e);toast(`Generation failed: ${e.message}`)}}
function getSegment(){return mission?.segments.find(s=>s.id===selectedSegmentId)||mission?.segments[0]}
function renderEverything(refocus=false){$('btn-reroll-segment').disabled=mission.generator.version!==VERSION;mission.validation=validateMission(mission);config=normalizeConfig(mission.settings);updateInputs();renderArchetypes();renderSegments();renderScene(refocus);renderPanels();renderMetrics();renderFloorplan();renderGraph();renderDiagnostics();renderTestPanel();$('hud-seed').textContent=`SEED: ${mission.seed}`;$('mission-path').textContent=`${ARCHETYPES[mission.archetype].label.toUpperCase()} / ${getSegment().label.toUpperCase()}`;const index=mission.segments.findIndex(s=>s.id===getSegment().id);$('hud-segment').textContent=`${mission.archetype==='cave'?'DEPTH':'LEVEL'} ${String(index+1).padStart(2,'0')} / ${String(mission.segments.length).padStart(2,'0')}`;$('hud-state').textContent=test?'TEST MODE':'EDITOR MODE';}
function renderSegments(){const el=$('segment-select');el.innerHTML=mission.segments.map(s=>`<option value="${esc(s.id)}">${esc(s.label)} · ${s.rooms.length} spaces</option>`).join('');el.value=selectedSegmentId}
function renderScene(refocus=false){if(!view)return;const cave=Boolean(getSegment().terrain);$('wireframe-control').hidden=!cave;$('grade-control').hidden=!cave;$('walk-camera').hidden=!cave||!test;view.setMission(mission,selectedSegmentId,catalog,{refocus});view.highlight(selection?.type==='room'?selection.id:null);view.setDoorStates(test?.openDoors||new Set());view.setAvatar(test?.position,!!test&&test.segmentId===selectedSegmentId)}
function switchSegment(id){if(test&&id!==test.segmentId){toast('Use a mission transition to change segments during Test mode.');$('segment-select').value=test.segmentId;return;}if(!mission.segments.some(s=>s.id===id))return;selectedSegmentId=id;selection=null;renderEverything(true)}
function setSelection(type,id){selection={type,id};view.highlight(type==='room'?id:null);renderInspector();renderFloorplan();}
function selectedRoom(){const s=getSegment();if(!selection)return null;if(selection.type==='room')return s.rooms.find(r=>r.id===selection.id);if(selection.type==='door')return s.rooms.find(r=>r.doorId===selection.id);if(selection.type==='prop')return s.rooms.find(r=>r.props.some(p=>p.id===selection.id));return null}
function onPick(pick){if(!pick)return;
 if(test){const candidates=findNearby(mission,test.segmentId,test.position,3.7).filter(x=>x.targetType===pick.type&&x.id===pick.id);if(candidates.length)interact(candidates[0]);else toast('Move closer to interact (E).');return}
 if(pick.type==='room'||pick.type==='door'||pick.type==='prop')setSelection(pick.type==='door'?'door':'room',pick.type==='prop'?getSegment().rooms.find(r=>r.props.some(p=>p.id===pick.id))?.id:pick.id);
 else if(pick.type==='transition'||pick.type==='interaction'||pick.type==='objective')setSelection(pick.type,pick.id);
 else if(pick.type==='corridor'||pick.type==='tunnel'){selection=null;renderInspector();toast(pick.id)}
}
function renderMetrics(){const s=getSegment();
 const area=s.terrain?.stats.area??(s.archetype==='cave'?Math.abs(caveBoundary(s).reduce((n,[a,b])=>n+a.x*b.z-a.z*b.x,0))/2:
  [...s.rooms,...s.corridors].reduce((n,region)=>n+region.bounds.w*region.bounds.d,0));
 $('stat-area').textContent=`${!s.architecture&&s.archetype!=='cave'?'~':''}${nf(Math.round(area))} m²`;
 $('stat-rooms').textContent=nf(s.rooms.length);$('stat-segments').textContent=nf(mission.segments.length);$('stat-props').textContent=nf(mission.validation.totals?.props||0);$('stat-links').textContent=nf(mission.transitions.length);$('stat-status').textContent=mission.validation.ok?'✓ VALIDATED':'⚠ ERRORS';$('stat-status').className=mission.validation.ok?'metric-good':'metric-bad';$('footer-diagnostics').textContent=mission.validation.ok?'MISSION GRAPH VALID':'ISSUES IN MISSION GRAPH'}
function renderPanels(){renderInspector();renderAssetPanel()}
function renderInspector(){
 $('btn-focus').disabled=selection?.type!=='room';const target=$('inspector-body'),s=getSegment(),room=selectedRoom();
 if(!selection){target.innerHTML=`<div class="empty-selection"><span class="glyph">▧</span><strong>Explore the generated mission</strong><p>Select a room from the 3D model or floor plan to adjust its function, door locks and furnishings.</p></div><div class="section-label">SEGMENT OVERVIEW</div><div class="data-stack"><div class="data-row"><span>Environment</span><strong>${esc(ARCHETYPES[mission.archetype].label)}</strong></div><div class="data-row"><span>Rooms</span><strong>${s.rooms.length}</strong></div><div class="data-row"><span>Hallways / tunnels</span><strong>${s.corridors.length+s.tunnels.length}</strong></div><div class="data-row"><span>Interactions</span><strong>${s.interactables.length}</strong></div><div class="data-row"><span>Connected exits</span><strong>${mission.transitions.filter(t=>t.fromSegmentId===s.id).length}</strong></div></div><div class="section-label">MISSION OBJECTIVES</div>${mission.objectives.map(o=>`<div class="object-row">${esc(o.label)}<span>${esc(o.segmentId)}</span></div>`).join('')}`;return}
 if(room){const door=s.doors.find(d=>d.id===room.doorId);const types=[...ARCHETYPES[mission.archetype].rooms,...ARCHETYPES[mission.archetype].landmarks];
  target.innerHTML=`<span class="tag">${room.phase==='landmark'?'LANDMARK':'ROOM'} · ${esc(room.id)}</span><div class="selected-title">${esc(room.name)}</div><div class="data-stack"><div class="data-row"><span>Space type</span><strong>${esc(room.regionType?.replace('_',' ')||room.shape)}</strong></div>${room.department?`<div class="data-row"><span>Department</span><strong>${esc(room.department)}</strong></div>`:''}<div class="data-row"><span>Footprint</span><strong>${room.bounds?`${esc(room.bounds.w)} × ${esc(room.bounds.d)} m`:'Organic polygon'}</strong></div><div class="data-row"><span>Furniture / objects</span><strong>${room.props.length}</strong></div><div class="data-row"><span>Security</span><strong>${door?door.requires.length?'RESTRICTED':'Unrestricted':'Cave / open'}</strong></div></div>
  <div class="section-label">ROOM EDITING</div><label class="inspector-field">Room classification<select id="room-classification" class="inspector-input">${[...new Set([room.name,...types])].map(t=>`<option value="${esc(t)}" ${t===room.name?'selected':''}>${esc(t)}</option>`).join('')}</select></label>
  ${door?`<label class="inspector-field">Door security<select id="room-security" class="inspector-input"><option value="open" ${!door.requires.length?'selected':''}>Normal / unlocked</option><option value="locked" ${door.requires.length?'selected':''}>Secured / keycard required</option></select></label><div class="data-row"><span>Door ID</span><strong>${esc(door.id)}</strong></div>`:''}
  <div class="section-label">PLACE ENVIRONMENTAL ASSETS</div><label class="inspector-field">Registered object family<select class="inspector-input" id="room-prop-family">${catalog.map(a=>`<option value="${esc(a.id)}">${esc(a.label)}</option>`).join('')}</select></label><div class="inspector-button-row"><button class="button button-secondary" id="btn-room-add">＋ Add Object</button><button class="button button-ghost" id="btn-room-clear">Clear Props</button></div>
  <div class="section-label">TRANSITION AUTHORING</div><label class="inspector-field">Destination segment<select id="room-link-segment" class="inspector-input">${mission.segments.map(x=>`<option value="${esc(x.id)}">${esc(x.label)} ${x.id===s.id?'(same segment)':''}</option>`).join('')}</select></label><label class="inspector-field">Transition device<select id="room-link-kind" class="inspector-input">${['portal','elevator','security_gate','service_door','stairwell','teleport_pad','mine_lift'].map(k=>`<option value="${k}">${k.replaceAll('_',' ')}</option>`).join('')}</select></label><label class="inspector-field"><span><input type="checkbox" id="room-link-return" checked style="width:auto;height:auto;margin-right:6px"> Create return link</span></label><button class="button button-secondary button-wide" id="btn-room-link">＋ Create Logical Transition</button>
  <div class="section-label">ROOM ASSETS</div><div class="room-assets">${room.props.length?room.props.slice(0,32).map(p=>`<div class="object-row"><span>${esc(catalog.find(a=>a.id===p.familyId)?.label||p.familyId)}</span><button data-remove-prop="${esc(p.id)}" title="Remove object">✕</button></div>`).join(''):'<p class="panel-copy">No objects placed.</p>'}</div>`;
  $('room-classification').addEventListener('change',e=>{room.name=e.target.value;room.manual=true;dirty=true;renderInspector();renderFloorplan();toast(`Room updated: ${room.name}`)});
  if(door)$('room-security').addEventListener('change',e=>{setDoorSecurity(s,room,door,e.target.value==='locked');dirty=true;onMissionMutated(true);toast('Door security updated with obtainable access token')});
  $('btn-room-link').addEventListener('click',()=>{
   const target=mission.segments.find(v=>v.id===$('room-link-segment').value),kind=$('room-link-kind').value,makeReturn=$('room-link-return').checked;
   if(!target)return;const ordinal=mission.transitions.length+1,base=`custom-${s.id}-${ordinal}`,end=target.id===s.id?target.anchors.exit:target.anchors.entry;
   mission.transitions.push({id:base,fromSegmentId:s.id,toSegmentId:target.id,fromAnchor:{...room.center},toAnchor:{...end},kind,label:`${room.name} → ${target.label}`,requires:[],direction:'custom',spawnFacing:0});
   if(makeReturn)mission.transitions.push({id:`${base}-return`,fromSegmentId:target.id,toSegmentId:s.id,fromAnchor:{...end},toAnchor:{...room.center},kind,label:`Return to ${room.name}`,requires:[],direction:'return',spawnFacing:Math.PI});
   dirty=true;onMissionMutated(true);toast(`Linked ${room.name} to ${target.label}${makeReturn?' (two-way)':''}`);
  });
  $('btn-room-add').addEventListener('click',()=>{
   const asset=catalog.find(a=>a.id===$('room-prop-family').value);
   if(!asset)return;
   if(!placeRoomAsset(s,room,asset)){toast('No clear placement found for this object.');return;}
   dirty=true;onMissionMutated(true);
   toast(`${asset.label} placed`);
  });
  $('btn-room-clear').addEventListener('click',()=>{room.props=[];room.manual=true;dirty=true;onMissionMutated(true)});
  target.querySelectorAll('[data-remove-prop]').forEach(el=>el.addEventListener('click',()=>{room.props=room.props.filter(p=>p.id!==el.dataset.removeProp);room.manual=true;dirty=true;onMissionMutated(true)}));return;
 }
 if(selection.type==='transition'){
  const t=mission.transitions.find(v=>v.id===selection.id);if(!t)return;
  target.innerHTML=`<span class="tag gold">LOGICAL TRANSITION</span><div class="selected-title">${esc(t.label)}</div><div class="data-stack"><div class="data-row"><span>Transition ID</span><strong>${esc(t.id)}</strong></div><div class="data-row"><span>Device</span><strong>${esc(t.kind)}</strong></div><div class="data-row"><span>Source</span><strong>${esc(t.fromSegmentId)}</strong></div><div class="data-row"><span>Destination</span><strong>${esc(t.toSegmentId)}</strong></div><div class="data-row"><span>Requirements</span><strong>${esc(t.requires.join(', ')||'None')}</strong></div></div><div class="section-label">TRANSITION EDITING</div><label class="inspector-field">Target segment<select id="transition-target" class="inspector-input">${mission.segments.map(s=>`<option value="${esc(s.id)}" ${t.toSegmentId===s.id?'selected':''}>${esc(s.label)}</option>`).join('')}</select></label><label class="inspector-field">Device type<select id="transition-kind" class="inspector-input">${['elevator','portal','mine_lift','security_gate','service_door','stairwell','teleport_pad'].map(k=>`<option value="${k}" ${t.kind===k?'selected':''}>${k.replace('_',' ')}</option>`).join('')}</select></label><div class="panel-copy">The spatial position of the destination is independent of its source. Switching target will use that segment's safe entry anchor.</div>`;
  $('transition-target')?.addEventListener('change',e=>{t.toSegmentId=e.target.value;t.toAnchor=deepCopy(mission.segments.find(s=>s.id===e.target.value).anchors.entry);dirty=true;onMissionMutated(false)});
  $('transition-kind')?.addEventListener('change',e=>{t.kind=e.target.value;dirty=true;onMissionMutated(true)});
  return;
 }
 const obj=s.interactables.find(i=>i.id===selection.id)||mission.objectives.find(o=>o.id===selection.id&&o.segmentId===s.id);
 if(obj){target.innerHTML=`<span class="tag">${esc(selection.type).toUpperCase()}</span><div class="selected-title">${esc(obj.label)}</div><div class="data-stack"><div class="data-row"><span>Identifier</span><strong>${esc(obj.id)}</strong></div><div class="data-row"><span>Room</span><strong>${esc(obj.roomId)}</strong></div><div class="data-row"><span>Grants / requires</span><strong>${esc((obj.grants||obj.requires||[]).join(', ')||'None')}</strong></div></div><div class="panel-copy">${esc(obj.description||'Mission content descriptor. State is simulated in Test mission mode.')}</div>`;return}
 target.innerHTML='<div class="empty-selection">Select a mission object to inspect it.</div>';
}
function setDoorSecurity(seg,room,door,locked){
 const grant=`manual-clearance-${room.id}`;
 door.lockedInitially=locked;
 if(locked)door.state='closed';
 if(locked){if(!door.requires.length){door.requires=[grant];door.kind='keycard';const source=seg.rooms.find(r=>r.id!==room.id&&!seg.doors.find(d=>d.id===r.doorId)?.requires.length)||seg.rooms.find(r=>r.id!==room.id);if(source)seg.interactables.push({id:`key-${room.id}`,segmentId:seg.id,roomId:source.id,position:{...source.center},label:`Obtain access to ${room.name}`,kind:'keycard',grants:[grant],requires:[],description:'Manually authored lock clearance'});}}
 else{
  const span=seg.architecture?.partitions.find(wall=>wall.id===door.partitionId);
  door.state=span?.opening?.type==='open'?'open':'closed';
  door.requires=[];door.kind='standard';seg.interactables=seg.interactables.filter(o=>o.id!==`key-${room.id}`);
 }
}
function onMissionMutated(rebuildScene){syncNavigation(mission);mission.validation=validateMission(mission);if(rebuildScene)renderScene(false);renderInspector();renderMetrics();renderFloorplan();renderGraph();renderDiagnostics()}
function fmtInt(v){return Number.isFinite(v)?Number(v).toFixed(1):'0.0'}
function floorBounds(s){if(s.terrain)return {minX:s.bounds.minX-5,maxX:s.bounds.maxX+5,minZ:s.bounds.minZ-5,maxZ:s.bounds.maxZ+5};let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;const points=[];
 for(const c of s.corridors)points.push({x:c.bounds.x-c.bounds.w/2,z:c.bounds.z-c.bounds.d/2},{x:c.bounds.x+c.bounds.w/2,z:c.bounds.z+c.bounds.d/2});
 for(const r of s.rooms){if(r.bounds)points.push({x:r.bounds.x-r.bounds.w/2,z:r.bounds.z-r.bounds.d/2},{x:r.bounds.x+r.bounds.w/2,z:r.bounds.z+r.bounds.d/2});else points.push(...r.polygon)}
 for(const p of points){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z)}
 return {minX:minX-5,maxX:maxX+5,minZ:minZ-5,maxZ:maxZ+5}
}
let planCamera=null,planDragged=false;
function applyPlanCamera(){
 const {x,z,width,height,zoom}=planCamera;
 $('floorplan').setAttribute('viewBox',`${x-width/(2*zoom)} ${z-height/(2*zoom)} ${width/zoom} ${height/zoom}`);
}
function zoomPlan(factor){
 if(!planCamera)return;
 planCamera.zoom=Math.max(1,Math.min(12,planCamera.zoom*factor));
 if(planCamera.zoom===1){planCamera.x=planCamera.centerX;planCamera.z=planCamera.centerZ;}
 applyPlanCamera();
}
function resetPlan(){
 if(!planCamera)return;
 planCamera.zoom=1;
 zoomPlan(1);
}
function renderFloorplan(){const svg=$('floorplan'),s=getSegment();if(!s)return;const b=floorBounds(s),width=b.maxX-b.minX,height=b.maxZ-b.minZ;
 if(planCamera?.segment!==s){
  const centerX=(b.minX+b.maxX)/2,centerZ=(b.minZ+b.maxZ)/2;
  planCamera={segment:s,centerX,centerZ,x:centerX,z:centerZ,width,height,zoom:1};
 }
 const active=selection?.id;
 let contents=`<rect x="${b.minX}" y="${b.minZ}" width="${width}" height="${height}" fill="#152836"/>`;
 for(const c of s.corridors){const a=c.bounds;contents+=`<rect x="${a.x-a.w/2}" y="${a.z-a.d/2}" width="${esc(a.w)}" height="${esc(a.d)}" fill="#2c6570" stroke="${s.architecture?'none':'#568f99'}" stroke-width=".15"/>`}
 for(const t of s.tunnels){
  const path=tunnelPath(t);
  if(s.terrain){
   contents+=`<polyline points="${esc(path.map(p=>`${p.x},${p.z}`).join(' '))}" fill="none" stroke="#687d79" stroke-width="${esc(t.width)}" stroke-linejoin="round" stroke-linecap="round"/>`;
  }else contents+=`<polygon points="${esc(tunnelPolygon(t).map(p=>`${p.x},${p.z}`).join(' '))}" fill="#687d79"/>`;
 }
 for(const room of s.rooms){const selected=room.id===active,base=selected?'#2b9e9c':room.phase==='landmark'?'#3d7d8c':'#375466',attrs=`data-room="${esc(room.id)}" stroke="${selected?'#c2fff5':s.architecture||s.archetype==='cave'?'none':'#6d8c9a'}" stroke-width="${selected?.7:.24}"`;
  if(room.bounds){const a=room.bounds;contents+=`<rect ${attrs} x="${a.x-a.w/2}" y="${a.z-a.d/2}" width="${esc(a.w)}" height="${esc(a.d)}" rx=".3" fill="${base}"/>`}
  else contents+=`<polygon ${attrs} points="${esc(room.polygon.map(p=>`${p.x},${p.z}`).join(' '))}" fill="${base}"/>`;
  const pos=room.center;contents+=`<text class="svg-label" x="${esc(pos.x)}" y="${esc(pos.z)}" font-size="1.35" fill="#d3e9e7" text-anchor="middle">${esc(room.name.length>15?room.name.slice(0,13)+'…':room.name)}</text>`;
 }
 for(const room of s.rooms)for(const column of room.columns||[]){
  contents+=`<rect x="${column.x-column.w/2}" y="${column.z-column.d/2}" width="${esc(column.w)}" height="${esc(column.d)}" fill="#c1d5d8"/>`;
 }
 const wallLine=([a,b])=>`<line x1="${esc(a.x)}" y1="${esc(a.z)}" x2="${esc(b.x)}" y2="${esc(b.z)}" stroke="#a4bac6" stroke-width=".24"/>`;
 if(s.architecture)contents+=s.architecture.partitions.flatMap(wallPieces).map(wallLine).join('');
 else if(s.terrain){
  contents+=terrainBoundary(s.terrain).map(wallLine).join('');
  if($('toggle-wireframe').checked||$('toggle-grade').checked){
   const {indices,vertices}=s.terrain.floor;
   let path='';
   const wire=$('toggle-wireframe').checked;
   const triangles=wire?Array.from({length:indices.length/3},(_,i)=>i):s.terrain.navigation.steepTriangles||[];
   for(const i of triangles){
    const points=indices.slice(i*3,i*3+3).map(index=>`${Number(vertices[index*3]).toFixed(2)} ${Number(vertices[index*3+2]).toFixed(2)}`);
    path+=`M${points.join('L')}Z`;
   }
   contents+=`<path d="${path}" fill="${wire?'none':'#e18752'}" stroke="${wire?'#91b9ac':'none'}" stroke-width=".12" pointer-events="none"/>`;
  }
 }else if(s.archetype==='cave')contents+=caveBoundary(s).map(wallLine).join('');
 for(const d of s.doors.filter(d=>d.state!=='open'||d.requires.length)){contents+=`<circle cx="${esc(d.position.x)}" cy="${esc(d.position.z)}" r=".7" fill="${d.requires.length?'#ffb083':'#6eecdb'}"/>`}
 for(const i of s.interactables){contents+=`<circle cx="${esc(i.position.x)}" cy="${esc(i.position.z)}" r=".65" fill="#eec279" stroke="#4c2e12" stroke-width=".15"/>`}
 for(const t of mission.transitions.filter(t=>t.fromSegmentId===s.id)){contents+=`<circle cx="${esc(t.fromAnchor.x)}" cy="${esc(t.fromAnchor.z)}" r="1.3" fill="#c3a0f8" stroke="#1c2e40" stroke-width=".35"/>`}
 for(const o of mission.objectives.filter(o=>o.segmentId===s.id)){contents+=`<circle cx="${esc(o.position.x)}" cy="${esc(o.position.z)}" r="1.05" fill="#8efab6"/>`}
 if(test&&test.segmentId===s.id)contents+=`<circle id="plan-player" cx="${esc(test.position.x)}" cy="${esc(test.position.z)}" r="1.15" fill="#ffffff" stroke="#24aee0" stroke-width=".45"/>`;
 applyPlanCamera();svg.setAttribute('preserveAspectRatio','xMidYMid meet');svg.innerHTML=contents;
 svg.querySelectorAll('[data-room]').forEach(el=>el.addEventListener('click',()=>{if(!test&&!planDragged){setSelection('room',el.dataset.room);toast(`Selected ${s.rooms.find(r=>r.id===el.dataset.room)?.name}`)}}));
}
function renderGraph(){
 const svg=$('mission-graph'),segments=mission.segments,n=segments.length,w=Math.max(700,n*155+45);
 const indices=new Map(segments.map((segment,index)=>[segment.id,index]));
 let out=`<defs><marker id="mission-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="#a7d8de"/></marker></defs><rect width="${w}" height="155" fill="#152633"/>`;
 for(const t of mission.transitions){
  const a=indices.get(t.fromSegmentId),b=indices.get(t.toSegmentId);
  if(a===undefined||b===undefined)continue;
  const x1=85+a*155,x2=85+b*155;
  const back=b<a,shortcut=t.direction==='shortcut',local=a===b;
  const d=local?`M ${x1-24} 105 C ${x1-64} 154 ${x1+64} 154 ${x1+24} 105`:
   shortcut?`M ${x1} 30 Q ${(x1+x2)/2} -12 ${x2} 30`:
   `M ${x1+(back?-54:54)} ${back?85:59} L ${x2+(back?54:-54)} ${back?85:59}`;
  out+=`<path d="${d}" stroke="${t.requires.length?'#dfb270':'#4cc9d4'}" stroke-width="2.5" stroke-dasharray="${t.requires.length?'5,4':'none'}" fill="none" marker-end="url(#mission-arrow)"><title>${esc(t.label)} · ${esc(t.kind)}${t.requires.length?' · access required':''}</title></path>`;
 }
 for(let i=0;i<n;i++){const s=segments[i],x=31+i*155,active=s.id===selectedSegmentId;out+=`<g data-seg="${esc(s.id)}" style="cursor:pointer"><rect x="${x}" y="30" rx="8" width="108" height="75" fill="${active?'#245a5b':'#1b3748'}" stroke="${active?'#4aebd7':'#44677b'}"/><text x="${x+54}" y="54" font-size="10" text-anchor="middle" font-weight="bold" fill="#d4eeec">${esc(s.label)}</text><text x="${x+54}" y="73" font-size="9" text-anchor="middle" fill="#83a8b3">${s.rooms.length} rooms</text><text x="${x+54}" y="91" font-size="9" text-anchor="middle" fill="#9be3df">${s.interactables.length} interactions</text></g>`}
 svg.setAttribute('viewBox',`0 0 ${w} 155`);svg.setAttribute('preserveAspectRatio','xMinYMid meet');svg.innerHTML=out;
 svg.querySelectorAll('[data-seg]').forEach(el=>el.addEventListener('click',()=>switchSegment(el.dataset.seg)));
}
function renderDiagnostics(){const v=mission.validation, segment=getSegment(), terrain=segment.terrain;
 const widths=segment.tunnels.map(t=>t.width);
 const length=segment.tunnels.reduce((total,t)=>{
  const points=tunnelPath(t);
  return total+points.slice(1).reduce((sum,b,i)=>sum+Math.hypot(b.x-points[i].x,(b.y||0)-(points[i].y||0),b.z-points[i].z),0);
 },0);
 const terrainDetails=terrain?`<div class="diagnostic-entry">Cave mesh · ${nf(terrain.stats.triangles)} triangles · ${fmtInt(terrain.grid.step)} m spacing · elevation ${fmtInt(terrain.stats.elevationMin)} to ${fmtInt(terrain.stats.elevationMax)} m · roof high point ${fmtInt(terrain.stats.roofMax)} m · ${terrain.formations.length} formations and ${terrain.landforms?.length||0} ridges or basins</div><div class="diagnostic-entry">Passages · ${segment.tunnels.length} · ${nf(Math.round(length))} m of tunnels · minimum / mean width ${fmtInt(Math.min(...widths))} / ${fmtInt(widths.reduce((sum,width)=>sum+width,0)/widths.length)} m · minimum headroom ${fmtInt(terrain.navigation.minClearance)} m · maximum grade ${fmtInt(terrain.navigation.maxSlope*100)}%</div><div class="diagnostic-entry">Floor within grade limit · ${nf(Math.round(terrain.stats.walkableArea||0))} m²${terrain.stats.widenedTunnels?` · ${terrain.stats.widenedTunnels} passages widened to retain mesh clearance`:''}</div>`:'';$('diagnostics-panel').innerHTML=`<div class="diagnostic-header">${v.ok?'✓ PASS':'✕ FAIL'} · ${v.reachableSegments.length} / ${mission.segments.length} reachable segments · ${v.reachableRooms.length} reachable rooms · ${v.grants.length} obtainable grants</div>${v.errors.length?v.errors.map(e=>`<div class="diagnostic-entry error">✕ ${esc(e)}</div>`).join(''):'<div class="diagnostic-entry">✓ All mandatory objectives reachable through the progression graph.</div>'}${v.warnings.map(w=>`<div class="diagnostic-entry warn">⚠ ${esc(w)}</div>`).join('')}<div class="diagnostic-entry">Building validation follows partition openings. Terrain caves check slopes, clearance, and connected tunnel routes.</div>${terrainDetails}`}
function setVisualMode(mode){visualMode=mode;document.querySelectorAll('.mode-tab').forEach(b=>b.classList.toggle('active',b.dataset.visual===mode));for(const id of ['layout','graph','diagnostics'])$(id+'-panel').classList.toggle('hidden',id!==mode)}
function setRightPanel(panel){rightPanel=panel;document.querySelectorAll('.right-tab').forEach(b=>b.classList.toggle('active',b.dataset.panel===panel));for(const id of ['inspect','test','library'])$('panel-'+id).classList.toggle('hidden',id!==panel);if(panel==='library')renderAssetPanel()}
function renderAssetPanel(){const q=($('asset-search').value||'').toLowerCase(),list=catalog.filter(a=>a.label.toLowerCase().includes(q)||a.id.toLowerCase().includes(q));$('asset-count').textContent=`${catalog.length} families registered · ${externalBlueprints.length} imported blueprints`;$('asset-list').innerHTML=list.slice(0,120).map(a=>`<div class="asset-list-item"><span class="asset-color" style="background:${/^#[0-9a-f]{6}$/i.test(a.color)?a.color:'#73929d'}"></span><div><strong>${esc(a.label)}</strong><small>${esc(a.id)} · ${a.source==='b.city-object.v1'?'Imported B object':'Built-in proxy'}</small></div></div>`).join('')}
function exportedMission(){mission.validation=validateMission(mission);return serializeMission(mission)}
function saveConfig(){const name=prompt('Name this mission generator preset:',`${ARCHETYPES[config.archetype].label} #${config.seed}`);if(!name)return;let saved=[];try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'[]')}catch{}saved.unshift({name:name.slice(0,65),config:readConfig()});localStorage.setItem(SAVE_KEY,JSON.stringify(saved.slice(0,25)));renderSaved();toast('Preset saved in this browser')}
function renderSaved(){let saved=[];try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'[]')}catch{}$('save-count').textContent=saved.length;$('saved-list').innerHTML=saved.map((p,i)=>`<div class="saved-item"><span>${esc(p.name)}</span><div><button class="mini-btn" data-load="${i}">Load</button> <button class="mini-btn" data-delete="${i}">✕</button></div></div>`).join('');$('saved-list').querySelectorAll('[data-load]').forEach(b=>b.addEventListener('click',()=>{config=normalizeConfig(saved[+b.dataset.load].config);updateInputs();regenerate(true)}));$('saved-list').querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>{saved.splice(+b.dataset.delete,1);localStorage.setItem(SAVE_KEY,JSON.stringify(saved));renderSaved()}))}
async function receiveFile(file){try{if(file.size>15*1024*1024)throw new Error('JSON file too large (15 MB limit)');const data=JSON.parse(await file.text());
  if(data.schemaVersion===SCHEMA){if(test)stopTest();mission=importMission(data);config=mission.settings;selectedSegmentId=mission.segments[0].id;selection=null;renderEverything(true);toast(`Imported ${file.name} · ${mission.segments.length} segments`);return}
  if(data.schemaVersion==='b.city-object.v1'||data.schemaVersion==='b.city-assembly.v1'){if(!data.identity?.familyId)throw new Error('City Object blueprint is missing identity.familyId');externalBlueprints=externalBlueprints.filter(bp=>bp.identity?.familyId!==data.identity.familyId);externalBlueprints.push(data);catalog=registryFromBlueprints(externalBlueprints);renderAssetPanel();toast(`Registered ${data.identity.familyLabel||data.identity.familyId} · physical dimensions imported`);return}
  if(data.schemaVersion==='b.specialty-building.v1'){if(!mission)throw new Error('Generate a mission first');mission.exteriorBinding={...mission.exteriorBinding,templateId:data.templateId||null,entranceAnchorId:data.entrances?.[0]?.id||'world-entrance',sourceSchema:data.schemaVersion};dirty=true;onMissionMutated(false);toast('Exterior building entry reference attached. Interior dimensions remain independent.');return}
  const settings=data.settings||data.config||data;
  if(settings.archetype&&ARCHETYPES[settings.archetype]){config=normalizeConfig(settings);updateInputs();regenerate(true);toast('Imported mission generator settings');return}
  throw new Error('Unsupported JSON. Expect a mission blueprint, B City Object blueprint, Specialty Building blueprint, or settings object.');
 }catch(e){console.error(e);toast(`Import failed: ${e.message}`)}}
function beginTest(){test={segmentId:mission.segments[0].id,position:{...mission.segments[0].anchors.safeSpawn},openDoors:new Set(),grants:new Set(),completed:new Set(),activated:new Set(),steps:0};selectedSegmentId=test.segmentId;selection=null;setRightPanel('test');renderEverything(true);toast('Test started. Use WASD, Shift and E to interact.');}
function stopTest(){test=null;if(mission)renderEverything(false);toast('Exited local mission preview')}
function canUse(target){if(!test)return false;const segment=getSegment();if(target.targetType==='door')return true;const area=areaAt(segment,test.position);if(target.roomId&&!([target.roomId].includes(area)))return false;return true}
function interact(target){if(!test||target.distance>3.7)return;if(!canUse(target)){toast('Enter the room first to interact.');return}
 if(target.targetType==='door'){
  const missing=(target.requires||[]).filter(k=>!test.grants.has(k));if(missing.length){toast(`Door locked: required ${missing.join(', ')}`);return}
  if(test.openDoors.has(target.id)){test.openDoors.delete(target.id);toast('Door closed')}else{test.openDoors.add(target.id);toast('Door opened')}
  view.setDoorStates(test.openDoors);
 }else if(target.targetType==='interaction'){
  test.activated.add(target.id);for(const grant of target.grants||[])test.grants.add(grant);toast(`${target.label} · ${target.grants?.length?'Clearance granted':'Activated'}`);
 }else if(target.targetType==='transition'){
  const missing=(target.requires||[]).filter(k=>!test.grants.has(k));if(missing.length){toast(`Transition locked: ${missing.join(', ')}`);return}
  const dest=mission.segments.find(s=>s.id===target.toSegmentId);if(!dest){toast('Missing destination segment!');return}
  test.segmentId=dest.id;test.position=terrainPosition(dest,target.toAnchor);selectedSegmentId=dest.id;selection=null;renderEverything(true);toast(`Transferred to ${dest.label} within same mission instance`);
 }else if(target.targetType==='objective'){
  if(!(target.requires||[]).every(k=>test.grants.has(k))){toast('Objective requirements are not satisfied');return}
  test.completed.add(target.id);for(const grant of target.grants||[])test.grants.add(grant);toast(`Objective completed: ${target.label}`);
 }
 renderTestPanel();renderFloorplan();
}
function nearActions(){if(!test)return[];return findNearby(mission,test.segmentId,test.position,3.7).map(t=>({...t,usable:canUse(t)}))}
function renderTestPanel(){const status=$('test-status'),actions=$('test-actions');$('btn-test-start').classList.toggle('hidden',!!test);$('btn-test-stop').classList.toggle('hidden',!test);
 if(!test){status.innerHTML='<p>Enter the preview to test movement, collect security keys, open doors and travel between independent segments. Click interaction markers or press E near a target.</p>';actions.innerHTML='';return}
 const s=mission.segments.find(s=>s.id===test.segmentId);status.innerHTML=`<div class="data-stack"><div class="data-row"><span>Current area</span><strong>${esc(s.label)}</strong></div><div class="data-row"><span>Position</span><strong>${fmtInt(test.position.x)}, ${fmtInt(test.position.z)} m · elevation ${fmtInt(test.position.y||0)} m</strong></div><div class="data-row"><span>Clearances</span><strong>${test.grants.size}</strong></div><div class="data-row"><span>Completed objectives</span><strong>${test.completed.size} / ${mission.objectives.length}</strong></div></div><div class="section-label">AVAILABLE INTERACTIONS</div>`;
 const near=nearActions();actions.innerHTML=near.length?near.map(t=>`<button class="test-action" data-action="${esc(t.id)}" data-type="${t.targetType}" ${t.usable?'':'disabled'}>${esc(t.label||t.kind)} <small>${t.distance.toFixed(1)}m away · ${t.usable?'Press E / Click to use':'Must enter room'}</small></button>`).join(''):'<p class="panel-copy">Nothing within range. Navigate toward a room, colored interaction marker or elevator.</p>';
 actions.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>{const target=near.find(t=>t.id===b.dataset.action&&t.targetType===b.dataset.type);if(target)interact(target)}));
}
const pressed=new Set();let lastFrame=performance.now(),lastPanelUpdate=0;
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.045,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
 if(!test||!mission||!view)return;let dx=0,dz=0;if(pressed.has('KeyW')||pressed.has('ArrowUp'))dz--;if(pressed.has('KeyS')||pressed.has('ArrowDown'))dz++;if(pressed.has('KeyA')||pressed.has('ArrowLeft'))dx--;if(pressed.has('KeyD')||pressed.has('ArrowRight'))dx++;
 if(dx||dz){const len=Math.hypot(dx,dz),speed=pressed.has('ShiftLeft')||pressed.has('ShiftRight')?9:5.1,move={x:dx/len*dt*speed,z:dz/len*dt*speed},segment=getSegment(),p=test.position;
  const xNext={x:p.x+move.x,z:p.z};if(canMove(segment,p,xNext,test.openDoors))p.x=xNext.x;
  const zNext={x:p.x,z:p.z+move.z};if(canMove(segment,p,zNext,test.openDoors))p.z=zNext.z;
  if(segment.terrain)p.y=terrainPosition(segment,p).y;
  view.setAvatar(p,true);test.steps++;view.follow(p);
  const marker=$('plan-player');
  if(marker){marker.setAttribute('cx',p.x);marker.setAttribute('cy',p.z);}
 }
 if(now-lastPanelUpdate>220){lastPanelUpdate=now;renderTestPanel();}
}
function bindEvents(){
 for(const key of cfgKeys){$('cfg-'+key).addEventListener('input',e=>{const output=$('v-'+key);if(output)output.textContent=configLabel(key,e.target.value)});$('cfg-'+key).addEventListener('change',()=>{config=readConfig();if(['theme','condition'].includes(key))regenerate(false)})}
 const floorplan=$('floorplan');
 $('plan-fit').addEventListener('click',resetPlan);
 $('plan-zoom-in').addEventListener('click',()=>zoomPlan(1.4));
 $('plan-zoom-out').addEventListener('click',()=>zoomPlan(1/1.4));
 floorplan.addEventListener('wheel',event=>{
  event.preventDefault();
  zoomPlan(event.deltaY<0?1.25:.8);
 },{passive:false});
 let planDrag;
 floorplan.addEventListener('pointerdown',event=>{
  planDragged=false;
  if(planCamera?.zoom>1&&event.button===0){
   planDrag={x:event.clientX,y:event.clientY,cx:planCamera.x,cz:planCamera.z,id:event.pointerId};
  }
 });
 floorplan.addEventListener('pointermove',event=>{
  if(!planDrag||event.pointerId!==planDrag.id||!event.buttons)return;
  const dx=event.clientX-planDrag.x,dy=event.clientY-planDrag.y;
  if(!planDragged&&Math.hypot(dx,dy)<5)return;
  if(!planDragged)floorplan.setPointerCapture(event.pointerId);
  planDragged=true;
  const scale=floorplan.getScreenCTM()?.a||1;
  planCamera.x=Math.max(planCamera.centerX-planCamera.width/2,Math.min(planCamera.centerX+planCamera.width/2,planDrag.cx-dx/scale));
  planCamera.z=Math.max(planCamera.centerZ-planCamera.height/2,Math.min(planCamera.centerZ+planCamera.height/2,planDrag.cz-dy/scale));
  applyPlanCamera();
 });
 for(const type of ['pointerup','pointercancel'])floorplan.addEventListener(type,()=>{planDrag=null;});
 const scenarios=$('scenario-preset');
 for(const [scale,label] of [['compact','Compact'],['standard','Standard'],['expansive','Expansive'],['massive','Massive']]){
  const group=document.createElement('optgroup');
  group.label=label;
  SCENARIOS.forEach(([name,archetype,settings],index)=>{
   if((settings.scale||ARCHETYPE_PRESETS[archetype].scale||DEFAULT_CONFIG.scale)===scale)group.append(new Option(name,index));
  });
  scenarios.append(group);
 }
 scenarios.addEventListener('change',()=>{
  if(scenarios.value==='')return;
  const [label,archetype,overrides]=SCENARIOS[Number(scenarios.value)];
  applyScenario(archetype,overrides);
  toast(`Loaded ${label}`);
 });
 const workspace=$('mission-workspace');
 const toggleTheatre=()=>{
  const enabled=document.querySelector('.studio-layout').classList.toggle('is-theatre');
  $('btn-theatre').setAttribute('aria-pressed',enabled);
  $('btn-theatre').textContent=enabled?'Exit Theatre':'Theatre';
 };
 const toggleFullscreen=async()=>{
  try{
   if(document.fullscreenElement===workspace)await document.exitFullscreen();
   else await workspace.requestFullscreen();
  }catch(error){toast(`Fullscreen unavailable: ${error.message}`);}
 };
 $('btn-theatre').addEventListener('click',toggleTheatre);
 $('btn-fullscreen').addEventListener('click',toggleFullscreen);
 document.addEventListener('fullscreenchange',()=>{
  const enabled=document.fullscreenElement===workspace;
  $('btn-fullscreen').setAttribute('aria-pressed',enabled);
  $('btn-fullscreen').textContent=enabled?'Exit Fullscreen':'Fullscreen';
 });
 $('btn-focus').addEventListener('click',()=>view?.focusRoom(selection?.id));
 $('btn-iso').addEventListener('click',()=>view?.isometricView());
 $('btn-seed').addEventListener('click',()=>{$('cfg-seed').value=1+Math.floor(Math.random()*999999);regenerate(true)});
 $('btn-generate').addEventListener('click',()=>regenerate(true));
 $('btn-reroll-segment').addEventListener('click',()=>{
  if(test)stopTest();
  rerollSegment(mission,selectedSegmentId,catalog);
  selection=null;
  dirty=true;
  renderEverything(true);
  toast('Active segment regenerated');
 });
 $('btn-reroll-rooms').addEventListener('click',()=>{
  mission.settings.assignmentSeed++;
  assignRoomNames(mission);
  dirty=true;
  renderEverything(false);
  toast('Room assignments refreshed. Manually assigned names are preserved.');
 });
 $('btn-reroll-encounters').addEventListener('click',()=>{
  mission.settings.encounterSeed++;
  mission.settings.encounterDensity=Number($('cfg-encounterDensity').value);
  populateEncounters(mission);
  dirty=true;
  renderEverything(false);
  toast('Encounter placement refreshed');
 });
 $('btn-redecorate').addEventListener('click',()=>{if(test)stopTest();mission.settings.decorSeed++;mission.settings.clutter=Number($('cfg-clutter').value);config=normalizeConfig(mission.settings);for(const s of mission.segments)for(const r of s.rooms)if(!r.manual)r.props=[];decorateMission(mission,catalog);dirty=true;renderEverything(false);toast('Rerolled furnishing · geometry and transitions preserved')});
 $('segment-select').addEventListener('change',e=>switchSegment(e.target.value));
 document.querySelectorAll('.mode-tab').forEach(b=>b.addEventListener('click',()=>setVisualMode(b.dataset.visual)));
 document.querySelectorAll('.right-tab').forEach(b=>b.addEventListener('click',()=>setRightPanel(b.dataset.panel)));
 $('toggle-props').addEventListener('change',e=>{view.showProps=e.target.checked;renderScene(false)});
 $('toggle-gizmos').addEventListener('change',e=>{view.showGizmos=e.target.checked;renderScene(false)});
 $('toggle-walls').addEventListener('change',e=>{view.showWalls=e.target.checked;renderScene(false)});
 $('walk-camera').addEventListener('click',()=>{if(test)view.walkCamera(test.position)});
 $('toggle-grade').addEventListener('change',e=>{view.showGrade=e.target.checked;renderScene(false);renderFloorplan()});
 $('toggle-wireframe').addEventListener('change',e=>{view.showWireframe=e.target.checked;renderScene(false);renderFloorplan()});
 $('toggle-ceilings').addEventListener('change',e=>{view.showCeilings=e.target.checked;renderScene(false)});
 $('btn-fit').addEventListener('click',()=>view.fit());$('btn-top').addEventListener('click',()=>view.topView());$('btn-grid').addEventListener('click',()=>{showGrid=!showGrid;view.toggleGrid(showGrid)});$('btn-snapshot').addEventListener('click',()=>view.snapshot());
 $('btn-export-json').addEventListener('click',()=>{const data=exportedMission();downloadJSON(data,`b-zone-${data.archetype}-${data.seed}.mission.json`);toast('Exported complete versioned mission blueprint')});
 $('btn-export-glb').addEventListener('click',async()=>{try{await view.exportVisibleGLB();toast('Exported segment geometry')}catch(e){console.error(e);toast(`GLB export failed: ${e.message}`)}});
 $('btn-import').addEventListener('click',()=>{$('json-file').click()});$('btn-object-import').addEventListener('click',()=>{$('json-file').click()});
 $('json-file').addEventListener('change',async e=>{for(const f of [...e.target.files])await receiveFile(f);e.target.value=''});
 $('btn-save-config').addEventListener('click',saveConfig);
 $('asset-search').addEventListener('input',renderAssetPanel);
 $('btn-test-start').addEventListener('click',beginTest);$('btn-test-stop').addEventListener('click',stopTest);
 window.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName)||e.target?.isContentEditable)return;
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){pressed.add(e.code);if(test)e.preventDefault()}
  if(e.code==='KeyE'&&test&&!e.repeat){const t=nearActions().find(x=>x.usable);if(t)interact(t);e.preventDefault()}
  if(!test&&!e.repeat&&!e.ctrlKey&&!e.altKey&&!e.metaKey){
   if(e.code==='KeyT'&&document.fullscreenElement!==workspace)toggleTheatre();
   if(e.code==='KeyF')void toggleFullscreen();
  }
  if(e.code==='Escape'&&test&&!document.fullscreenElement)stopTest();
 });window.addEventListener('keyup',e=>pressed.delete(e.code));window.addEventListener('blur',()=>pressed.clear());
}
async function loadWebGL(){
 let timer;
 try{
  return await Promise.race([
   import('./mission-renderer.js'),
   new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Timed out loading Three.js')),12000)}),
  ]);
 }finally{clearTimeout(timer)}
}
async function init(){try{config=normalizeConfig({...DEFAULT_CONFIG,...ARCHETYPE_PRESETS.office});updateInputs();bindEvents();renderSaved();try{({MissionViewport}=await loadWebGL())}catch(threeError){console.warn('Three.js unavailable: using built-in Canvas fallback',threeError);({MissionViewport}=await import('./mission-fallback.js'));$('btn-export-glb').disabled=true;$('btn-export-glb').title='Three.js is unavailable. Reconnect to the internet and reload to enable GLB export.'}
  try{view=new MissionViewport($('mission-canvas'),{onPick})}catch(contextError){
   console.warn('WebGL context unavailable, switching to Canvas fallback',contextError);
   ({MissionViewport}=await import('./mission-fallback.js'));
   $('btn-export-glb').disabled=true;$('btn-export-glb').title='WebGL is unavailable; Segment GLB requires Three.js.';
   const previousCanvas=$('mission-canvas'),fallbackCanvas=previousCanvas.cloneNode();
   previousCanvas.replaceWith(fallbackCanvas);
   view=new MissionViewport(fallbackCanvas,{onPick});
  }
  regenerate(true);
  if(view.backend==='canvas')toast('Using offline Canvas preview — JSON mission generation remains fully functional');setVisualMode('layout');setRightPanel('inspect');requestAnimationFrame(frame);window.BZoneMissionStudio={schemaVersion:SCHEMA,version:VERSION,generateMission,validateMission,importMission,serializeMission,openBlueprint:blueprint=>{if(test)stopTest();mission=importMission(blueprint);selectedSegmentId=mission.segments[0].id;selection=null;renderEverything(true);document.querySelector('.studio-layout').scrollIntoView();},getMission:()=>deepCopy(mission),getCatalog:()=>deepCopy(catalog),getConfig:()=>deepCopy(config),getStatus:()=>({test:!!test,position:test?{...test.position}:null,dirty,segments:mission?.segments.length})};
}catch(e){console.error('Zone Mission Studio failed to initialize',e);$('render-error').classList.remove('hidden');$('render-error').textContent=`Unable to initialize 3D Zone Mission Studio: ${e.message}. Confirm Live Server has network access to the Three.js CDN and review your browser console.`}}
init();
