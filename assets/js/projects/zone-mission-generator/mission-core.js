import { CAVE_STYLES, generateCaveTerrain, sampleTerrain, terrainPosition, tunnelPath, canCrossTerrain, checkCaveTerrain } from './cave-terrain.js';
import { insidePolygon, tunnelPolygon } from './cave-geometry.js';
import { SCALES, LAYOUTS, buildInterior, departmentRoomName, moveThroughInterior } from './architecture.js';

/**
 * B Remastered • Zone Mission Generator • deterministic, renderer-independent engine.
 * Schema: b.zone-mission.v1. Coordinate convention: metres, right handed, Y up.
 * DO NOT confuse spatial segments (mission instances) with source-building geometry.
 */
export const SCHEMA = 'b.zone-mission.v1';
export const VERSION = '4.0.0';
export const B_UNITS_PER_METER = 16.404199475065617;
export const clamp = (v,lo,hi)=> Math.max(lo,Math.min(hi,Number(v)||0));
export const deepCopy = (v)=> JSON.parse(JSON.stringify(v));
export const hash32 = (s)=>{let h=2166136261;for(const c of String(s)){h=Math.imul(h^c.charCodeAt(0),16777619)}return h>>>0};
export const rng = seed => {let a=(seed>>>0)||1;return ()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296}};
const randomInt=(r,a,b)=>a+Math.floor(r()*(b-a+1));
const choose=(r,list)=>list[Math.min(list.length-1,Math.floor(r()*list.length))];
const round=(v)=>+Number(v).toFixed(3);
const P=(x,z)=>({x:round(x),z:round(z)});
/** Matches the current B City Object / Specialty Suite Y-up metres -> Z-up B units. */
export const toBGamePosition = ({x=0,y=0,z=0}={})=>({x:round(x*B_UNITS_PER_METER),y:round(-z*B_UNITS_PER_METER),z:round(y*B_UNITS_PER_METER)});
export const insideRect=(p,b,pad=0)=> Math.abs(p.x-b.x)<=b.w/2+pad && Math.abs(p.z-b.z)<=b.d/2+pad;
export const DEFAULT_CONFIG={archetype:'office',theme:'contemporary',condition:'operational',seed:2048,rooms:18,floors:1,branches:2,loops:1,locks:0,scale:'expansive',layout:'auto',targetArea:0,bayWidth:0,roomDepth:0,openness:72,corridorWidth:0,transitionSecurity:'open',transferKind:'auto',teleports:false,progression:'explore',clutter:42,roomVariation:50,lighting:'normal',ceilingHeight:0,encounterDensity:45,decorSeed:0,assignmentSeed:0,encounterSeed:0,segmentSeeds:[]};
export const ARCHETYPES={
 office:{label:'Corporate Offices',icon:'briefcase',rooms:['Open Office','Cubicle Area','Private Office','Conference Room','Executive Suite','Server Room','Copy Center','Break Room','Reception','Storage','Meeting Room','Security Office','Records Archive','Restroom','Operations Center'],landmarks:['Grand Atrium','Trading Floor','Executive Boardroom'],props:['desk','office_chair','computer','file_cabinet','plant','printer','bookshelf','sofa','reception_desk','server_rack','water_cooler']},
 laboratory:{label:'Research Laboratory',icon:'flask',rooms:['Chemistry Lab','Testing Chamber','Clean Room','Research Office','Observation Room','Server Facility','Containment Bay','Decontamination','Control Room','Equipment Storage','Security Room','Power Room','Maintenance','Specimen Archive'],landmarks:['Reactor Chamber','Containment Vault','Experiment Hall'],props:['lab_bench','console','tank','server_rack','storage_crate','cabinet','generator','computer','hazard_barrel']},
 precinct:{label:'Police Precinct',icon:'shield',rooms:['Reception','Detective Office','Interview Room','Interrogation','Briefing Room','Evidence Storage','Dispatch','Holding Cell','Armory','Staff Locker Room','Records Archive','Security Office','Break Room','Garage Access','Training Room'],landmarks:['Detention Block','Central Dispatch','Secure Evidence Vault'],props:['desk','office_chair','computer','file_cabinet','security_camera','storage_crate','sofa','bookshelf','reception_desk','bench']},
 hospital:{label:'Hospital / Clinic',icon:'heart',rooms:['Patient Ward','Treatment Room','Examination Room','Nurses Station','Supply Room','Reception','Emergency Triage','Operating Room','Imaging Room','Pharmacy','Medical Laboratory','Isolation Room','Administration','Staff Room','Waiting Area'],landmarks:['Emergency Department','Surgical Theater','Intensive Care Unit'],props:['hospital_bed','medical_monitor','medical_cart','cabinet','desk','office_chair','reception_desk','bench','plant','storage_crate']},
 warehouse:{label:'Industrial Warehouse',icon:'warehouse',rooms:['Receiving','Bulk Storage','Vehicle Service','Dispatch','Packing','Cold Storage'],landmarks:['High-Bay Storage','Loading Hall'],props:['storage_crate','generator','cabinet','hazard_barrel']},
 cave:{label:'Underground Caverns',icon:'mountain',rooms:['Natural Grotto','Rock Chamber','Mineral Pocket','Collapsed Hollow','Crystal Chamber','Mine Gallery','Underground Pool','Stalagmite Field','Forgotten Excavation','Deep Tunnel','Ancient Ruins','Subterranean Vault'],landmarks:['Great Cathedral Cavern','Abyssal Chamber','Forgotten Excavation'],props:['boulder','crystal','stalagmite','storage_crate','lantern','support_beam','hazard_barrel']}
};
export const THEMES=['contemporary','retro','industrial','futuristic','brutalist'];
export const CONDITIONS=['operational','worn','abandoned','damaged','lockdown'];
// Each catalog entry is an *exportable asset reference* + a stand-in mesh recipe.
// Imported real B city-object blueprints extend this registry; no native meshes are bundled.
export const BUILTIN_ASSETS=[
 ['desk','Office Desk',1.7,0.8,0.76,'#ad8363'],['office_chair','Swivel Chair',0.75,0.75,1.05,'#354a5b'],['computer','Workstation Monitor',0.6,0.28,0.5,'#1f7288'],['file_cabinet','Filing Cabinet',0.9,0.55,1.5,'#8397a2'],['plant','Potted Plant',0.7,0.7,1.45,'#638760'],['printer','Printer / Copier',0.8,0.6,0.7,'#a5adb8'],['bookshelf','Bookshelf',1.7,0.45,2.1,'#9c7554'],['sofa','Waiting Sofa',1.9,0.85,0.8,'#587b8c'],['reception_desk','Reception Desk',2.6,0.9,1.1,'#94775f'],['server_rack','Server Rack',0.9,0.85,2.2,'#485b6a'],['water_cooler','Water Cooler',0.55,0.55,1.35,'#a8c7ce'],['lab_bench','Laboratory Bench',2.2,0.85,0.9,'#7da6ac'],['console','Control Console',1.8,0.7,1.1,'#567987'],['tank','Containment Tank',1.1,1.1,2.4,'#65a4b3'],['storage_crate','Storage Crate',1.1,1.1,1.1,'#96734c'],['cabinet','Wall Cabinet',1.15,0.55,1.5,'#99a8a2'],['generator','Utility Generator',1.9,1.2,1.5,'#747c79'],['hazard_barrel','Hazard Barrel',0.7,0.7,1.2,'#ba8751'],['security_camera','Security Camera',0.35,0.35,0.3,'#7b8d9b'],['bench','Bench Seating',1.9,0.65,0.8,'#817b75'],['hospital_bed','Hospital Bed',1.15,2.3,0.83,'#c0d4dc'],['medical_monitor','Patient Monitor',0.65,0.4,0.9,'#529ca5'],['medical_cart','Medical Cart',0.85,0.55,1.05,'#b2c4c7'],['boulder','Rock Formation',1.7,1.5,1.25,'#746e69'],['crystal','Crystal Cluster',0.9,0.9,1.8,'#759fb5'],['stalagmite','Stalagmite',0.8,0.8,2.1,'#857d71'],['lantern','Cave Lantern',0.4,0.4,0.8,'#daae66'],['support_beam','Mine Support',2.3,0.4,2.7,'#897055']
].map(([id,label,width,depth,height,color])=>({id,label,width,depth,height,color,source:'built-in-proxy',externalBlueprint:null}));
export function registryFromBlueprints(blueprints=[]){
 const registry=new Map(BUILTIN_ASSETS.map(v=>[v.id,deepCopy(v)]));
 for(const bp of blueprints){
  if(!['b.city-object.v1','b.city-assembly.v1'].includes(bp?.schemaVersion)||!bp.identity?.familyId)continue;
  const ident=bp.identity, dim=bp.dimensions||{};
  const key=ident.familyId;
  registry.set(key,{id:key,label:ident.familyLabel||key,width:clamp(dim.widthMeters||1,0.15,50),depth:clamp(dim.depthMeters||1,0.15,50),height:clamp(dim.heightMeters||1,0.15,30),color:bp.materials?.primaryColor||'#7996a1',source:'b.city-object.v1',externalBlueprint:{schemaVersion:bp.schemaVersion,identity:ident,placement:bp.placement,dimensions:dim,parameters:bp.parameters}});
 }
 return Array.from(registry.values());
}
export function normalizeConfig(config={}){
 const v={...DEFAULT_CONFIG,...config};
 v.archetype=Object.hasOwn(ARCHETYPES,v.archetype)?v.archetype:'office';v.theme=THEMES.includes(v.theme)?v.theme:'contemporary';v.condition=CONDITIONS.includes(v.condition)?v.condition:'operational';
 v.scale=Object.hasOwn(SCALES,v.scale)?v.scale:DEFAULT_CONFIG.scale;
 v.layout=LAYOUTS.includes(v.layout)?v.layout:'auto';
 v.caveStyle=Object.hasOwn(CAVE_STYLES,v.caveStyle)?v.caveStyle:'limestone';
 for(const [key,value,min,max] of [
  ['caveChamberScale',1,0.65,2.5],['caveTunnelWidth',0,0,55],['caveTunnelLength',1,.65,2],
  ['caveDescent',0,0,180],['caveElevation',22,0,70],['caveRoughness',70,0,100],['caveTriangleSize',3,1,15],
  ['caveVault',24,0,65],['caveClearance',5,3,16],['caveOverhang',2.3,0,8],
  ['caveMaxSlope',.36,.15,.65],['caveFormations',70,0,100],['caveLandforms',48,0,100],
 ])v[key]=clamp(v[key]??value,min,max);
 v.cavePools=v.cavePools===true;
 if(v.caveTunnelWidth)v.caveTunnelWidth=Math.max(7,v.caveTunnelWidth);
 v.caveNetwork=['winding','basin','mine'].includes(v.caveNetwork)?v.caveNetwork:'basin';
 v.transitionSecurity=v.transitionSecurity==='keycard'?'keycard':'open';
 v.transferKind=['auto','elevator','stairwell','portal'].includes(v.transferKind)?v.transferKind:'auto';
 v.teleports=v.teleports===true;
 v.segmentSeeds=Array.isArray(v.segmentSeeds)?Array.from({length:Math.min(v.segmentSeeds.length,12)},(_,i)=>Math.trunc(clamp(v.segmentSeeds[i],0,999999))):[];
 v.assignmentSeed=Math.trunc(clamp(v.assignmentSeed,0,999999));
 v.encounterSeed=Math.trunc(clamp(v.encounterSeed,0,999999));
 v.lighting=['normal','bright','dim'].includes(v.lighting)?v.lighting:'normal';
 v.progression=['explore','security','boss'].includes(v.progression)?v.progression:'explore';
 for(const [k,a,b] of [['rooms',7,72],['floors',1,12],['targetArea',0,250000],['bayWidth',0,45],['roomDepth',0,50],['openness',0,100],['corridorWidth',0,18],['branches',0,3],['loops',0,3],['locks',0,5],['clutter',0,100],['roomVariation',0,100],['encounterDensity',0,100],['ceilingHeight',0,12],['decorSeed',0,999999]])v[k]=clamp(v[k],a,b);
 if(v.bayWidth)v.bayWidth=Math.max(7,v.bayWidth);
 if(v.roomDepth)v.roomDepth=Math.max(7,v.roomDepth);
 if(v.corridorWidth) v.corridorWidth=Math.max(3,v.corridorWidth);
 if(v.ceilingHeight) v.ceilingHeight=Math.max(2.8,v.ceilingHeight);
 v.seed=Math.max(1,Math.floor(Math.abs(Number(v.seed)||1)))>>>0;v.rooms=Math.round(v.rooms);v.floors=Math.round(v.floors);v.branches=Math.round(v.branches);v.loops=Math.round(v.loops);v.locks=Math.round(v.locks);v.decorSeed=Math.round(v.decorSeed);
 return v;
}
function makeRoom(segment,options){
 const id=`${segment.id}-r${String(segment.rooms.length+1).padStart(3,'0')}`;
 const room={id,segmentId:segment.id,kind:options.kind||'room',name:options.name,shape:options.shape||'rect',bounds:options.bounds||null,polygon:options.polygon||null,center:options.center|| (options.bounds?P(options.bounds.x,options.bounds.z):null),doorId:null,doorSide:options.doorSide||null,phase:options.phase||'standard',props:[],manual:false};
 segment.rooms.push(room);return room;
}
function cavePolygon(cx,cz,rx,rz,random){
 const n=15,phase=random()*Math.PI*2,pts=[];
 for(let i=0;i<n;i++){
  const t=i*2*Math.PI/n+phase,k=.80+random()*.4;
  pts.push(P(cx+Math.cos(t)*rx*k,cz+Math.sin(t)*rz*k));
 }
 return pts;
}
function genCaveSegment(segment,cfg,random){
 const n=Math.max(7,Math.min(50,Math.round(cfg.rooms*.79)));
 const baseSize=SCALES[cfg.scale].cave;
 const estimatedArea=(n*210+cfg.branches*230)*baseSize**2;
 const size=baseSize*(cfg.targetArea?clamp(Math.sqrt(cfg.targetArea/estimatedArea),.65,2.5):1);
 const mode=cfg.caveNetwork;
 const columns=mode==='winding'?n:Math.max(4,Math.ceil(Math.sqrt(n*1.7)));
 segment.layout=mode;
 const centers=[];
 for(let i=0;i<n;i++){
  const row=Math.floor(i/columns),column=row%2?columns-1-i%columns:i%columns;
  const drift=mode==='mine'?2:9;
  const spacing=cfg.caveTunnelLength;
  const x=(column*27*spacing+(random()-.5)*drift)*size;
  const z=(row*43*spacing+Math.sin(column*.65+segment.index)*(mode==='winding'?15:7)+(random()-.5)*drift)*size;
  const radius=(9+random()*4.8+(i%5===0?6:0))*size*cfg.caveChamberScale;
  const room=makeRoom(segment,{name:choose(random,i===n-1?ARCHETYPES.cave.landmarks:ARCHETYPES.cave.rooms),shape:'cavern',polygon:cavePolygon(x,z,radius,radius*(.75+random()*.5),random),center:P(x,z),phase:i===n-1?'landmark':'standard'});
  room.radius=round(radius);centers.push(room);
 }
 let edgeCount=0;
 const linked=new Set();
 const connect=(a,b,kind='tunnel')=>{
  const key=`${Math.min(a,b)}:${Math.max(a,b)}`;
  if(a===b||linked.has(key))return;
  linked.add(key);
  const p=centers[a],q=centers[b],width=cfg.caveTunnelWidth||((mode==='mine'?7:9)+random()*4)*size;
  segment.tunnels.push({id:`${segment.id}-t${++edgeCount}`,kind,from:p.id,to:q.id,width:round(width),fromPosition:p.center,toPosition:q.center});
 };
 for(let i=0;i<n-1;i++)connect(i,i+1);
 const shortcuts=[];
 for(let i=0;i<n-2;i++){
  if(i+columns<n&&mode!=='winding'){
   const other=2*(Math.floor(i/columns)+1)*columns-i-1;
   if(other<n&&other>i+1)shortcuts.push([i,other]);
  }else if(mode==='winding')shortcuts.push([i,i+2]);
 }
 for(let l=0;l<cfg.loops&&shortcuts.length;l++){
  const [[i,j]]=shortcuts.splice(randomInt(random,0,shortcuts.length-1),1);
  connect(i,j,'shortcut');
 }
 const parents=Array.from({length:n-3},(_,i)=>i+1);
 const sideCount=Math.min(parents.length,cfg.branches*3);
 for(let i=0;i<sideCount;i++){
  const [parent]=parents.splice(randomInt(random,0,parents.length-1),1),base=centers[parent];
  const distance=(30+random()*11)*size*cfg.caveTunnelLength;
  const angle=random()*Math.PI*2;
  const options=Array.from({length:8},(_,j)=>P(base.center.x+Math.cos(angle+j*Math.PI/4)*distance,base.center.z+Math.sin(angle+j*Math.PI/4)*distance));
  const target=options.find(p=>segment.rooms.every(r=>Math.hypot(p.x-r.center.x,p.z-r.center.z)>24*size));
  if(!target)continue;
  const {x,z}=target;
  const room=makeRoom(segment,{name:choose(random,ARCHETYPES.cave.rooms),shape:'cavern',center:P(x,z),polygon:cavePolygon(x,z,(7.3+random()*3)*size*cfg.caveChamberScale,(8+random()*3.5)*size*cfg.caveChamberScale,random)});
  room.radius=round(8.5*size*cfg.caveChamberScale);
  segment.tunnels.push({id:`${segment.id}-t${++edgeCount}`,kind:'side',from:base.id,to:room.id,width:round(cfg.caveTunnelWidth||((7+random()*3)*size)),fromPosition:base.center,toPosition:room.center});
 }
 for(const tunnel of segment.tunnels){
  const {fromPosition:a,toPosition:b}=tunnel;
  const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz)||1;
  const bend=(random()-.5)*tunnel.width*.34;
  tunnel.path=[a,P((a.x+b.x)/2-dz/length*bend,(a.z+b.z)/2+dx/length*bend),b];
 }
 segment.terrain=generateCaveTerrain(segment,cfg,random);
 for(const room of segment.rooms)Object.assign(room.center,terrainPosition(segment,room.center));
 for(const tunnel of segment.tunnels)tunnel.path=tunnel.path.map(p=>terrainPosition(segment,p));
 segment.anchors={entry:{...centers[0].center},exit:{...centers[n-1].center},safeSpawn:{...centers[0].center}};
 segment.floorNumber=segment.index+1;
 segment.architecturalHeight=segment.terrain.stats.roofMax-segment.terrain.stats.elevationMin;
 segment.environment.ceilingHeightMeters=segment.architecturalHeight;
 const points=segment.terrain.floor.vertices;
 const bounds={minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity};
 for(let i=0;i<points.length;i+=3){
  bounds.minX=Math.min(bounds.minX,points[i]);bounds.maxX=Math.max(bounds.maxX,points[i]);
  bounds.minZ=Math.min(bounds.minZ,points[i+2]);bounds.maxZ=Math.max(bounds.maxZ,points[i+2]);
 }
 segment.bounds=bounds;
 return segment;
}
export function areaAt(segment,p){
 if(!segment)return null;
 if(segment.terrain&&!sampleTerrain(segment.terrain,p))return null;
 for(const room of segment.rooms){if(room.shape==='rect'&&insideRect(p,room.bounds,segment.architecture ? .001 :-0.08))return room.id;if(room.shape==='cavern'&&insidePolygon(p,room.polygon))return room.id}
 for(const c of segment.corridors)if(insideRect(p,c.bounds,segment.architecture ? .001 :-0.05))return c.id;
 for(const t of segment.tunnels){
  const path=tunnelPath(t);
  if(path.slice(1).some((b,i)=>insidePolygon(p,tunnelPolygon({...t,fromPosition:path[i],toPosition:b}))))return t.id;
 }
 if(segment.terrain)return segment.id+'-terrain';
 return null;
}
const furnishingProfiles=[
 [/ward|treatment|emergency|isolation|triage/i,['hospital_bed','medical_monitor','medical_cart','cabinet']],
 [/equipment|reactor|test|containment|power/i,['lab_bench','console','tank','generator']],
 [/reception|intake|waiting|atrium/i,['reception_desk','sofa','bench','plant']],
 [/evidence|archive|storage|supply/i,['file_cabinet','bookshelf','cabinet','storage_crate']],
 [/market|office|work floor|dispatch|research/i,['desk','office_chair','computer','printer','file_cabinet']],
 [/crystal|mineral|cathedral/i,['crystal','boulder','stalagmite']],
];
function propOverlaps(a,b,clearance=0){
 return Math.abs(a.x-b.x)<(a.w+b.w)/2+clearance&&Math.abs(a.z-b.z)<(a.d+b.d)/2+clearance;
}
function caveRouteSpans(tunnels){
 return tunnels.flatMap(tunnel=>{
  const path=tunnelPath(tunnel);
  return path.slice(1).map((toPosition,i)=>({fromPosition:path[i],toPosition,width:tunnel.width}));
 });
}
function placementFits(room,footprint,entryPoints,tunnels){
 const {x,z,w,d}=footprint;
 const cornersFit=[-1,1].every(dx=>[-1,1].every(dz=>{
  const point={x:x+dx*w/2,z:z+dz*d/2};
  return room.bounds?insideRect(point,room.bounds,-.25):insidePolygon(point,room.polygon);
 }));
 const lane=room.phase==='landmark'?2.8:1.65;
 const center={...room.center,w:lane,d:lane};
 return cornersFit&&!propOverlaps(footprint,center,.2)&&
  !room.props.some(p=>p.footprint&&propOverlaps(footprint,p.footprint,.55))&&
  !room.columns?.some(column=>propOverlaps(footprint,column,.45))&&
  !entryPoints.some(point=>segmentHitsBox(room.center,point,footprint,lane/2))&&
  !tunnels.some(tunnel=>segmentHitsBox(tunnel.fromPosition,tunnel.toPosition,footprint,Math.min(2,tunnel.width*.35)));
}

export function placeRoomAsset(segment,room,asset){
 const openings=(segment.architecture?.partitions||[])
  .filter(wall=>wall.opening&&wall.regions.includes(room.id)).map(wall=>wall.opening.position);
 if(!segment.architecture)for(const door of segment.doors)if(door.roomId===room.id)openings.push(door.position);
 const radius=room.radius||5;
 const dx=(room.bounds?.w||radius*2)/2,dz=(room.bounds?.d||radius*2)/2;
 for(const [u,v] of [[-.7,-.7],[.7,-.7],[-.7,.7],[.7,.7],[0,-.7],[0,.7],[-.7,0],[.7,0],[-.4,-.4],[.4,.4]]){
  const x=room.center.x+dx*u,z=room.center.z+dz*v;
  const footprint={x,z,w:asset.width,d:asset.depth};
  if(!placementFits(room,footprint,openings,caveRouteSpans(segment.tunnels)))continue;
  let number=room.props.length+1;
  while(room.props.some(prop=>prop.id===`${room.id}-manual-${number}`))number++;
  room.props.push({id:`${room.id}-manual-${number}`,familyId:asset.id,position:P(x,z),rotation:0,scale:1,source:asset.source,collidable:true,footprint});
  room.manual=true;
  return true;
 }
 return false;
}
function furnishRoom(room,cfg,reg,seed,entryPoints,tunnels){
 const r=rng(hash32(`${seed}|${cfg.decorSeed}|${room.id}|furnish`));
 const archetypePool=ARCHETYPES[cfg.archetype].props;
 const specialization=furnishingProfiles.find(([pattern])=>pattern.test(room.name))?.[1]?.filter(id=>archetypePool.includes(id)&&reg.has(id));
 const pool=specialization?.length?specialization:archetypePool.filter(id=>reg.has(id));
 const area=room.bounds?room.bounds.w*room.bounds.d:Math.PI*(room.radius||5)**2;
 const max=Math.round(cfg.clutter/100*Math.min(34,Math.max(5,area/20)));
 room.props=room.manual && room.props?.length?room.props:[];
 if(room.manual)return;
 for(let i=0;i<max*3&&room.props.length<max;i++){
  const familyId=choose(r,pool);if(!familyId)break;
  const asset=reg.get(familyId);
  const rotate=(room.bounds?.d||0)>(room.bounds?.w||0);
  const w=rotate?asset.depth:asset.width,d=rotate?asset.width:asset.depth;
  let x,z;
  if(room.shape==='rect'){
   const marginX=Math.max(.8,w/2+.35),marginZ=Math.max(.8,d/2+.35);
   if(room.bounds.w<=2*marginX||room.bounds.d<=2*marginZ)continue;
   const spanX=Math.max(.4,room.bounds.w-2*marginX),spanZ=Math.max(.4,room.bounds.d-2*marginZ);
   const alongWall=/plant|cabinet|bookshelf|storage_crate|printer/.test(familyId);
   const inRows=/desk|bench|hospital_bed/.test(familyId)&&room.phase==='landmark';
   const offset=(span,step)=>clamp((Math.round((r()-.5)*span/step))*step,-span/2,span/2);
   x=room.bounds.x+(alongWall?(r()<.5?-1:1)*spanX/2:inRows?offset(spanX,Math.max(w+1.4,3)):(r()-.5)*spanX);
   z=room.bounds.z+(inRows?offset(spanZ,Math.max(d+1.6,3)):(r()-.5)*spanZ);
  }else{
   const theta=r()*Math.PI*2,rad=(room.radius||4)*(.32+r()*.37);
   x=room.center.x+Math.cos(theta)*rad;z=room.center.z+Math.sin(theta)*rad;
  }
  const footprint={x,z,w,d};
  if(!placementFits(room,footprint,entryPoints,tunnels))continue;
  room.props.push({id:`${room.id}-prop${i+1}`,familyId,position:P(x,z),rotation:rotate?Math.PI/2:0,scale:1,source:asset.source,collidable:true,footprint});
 }
}
export function decorateMission(mission,catalog=BUILTIN_ASSETS){
 const registry=new Map(catalog.map(asset=>[asset.id,asset]));
 for(const segment of mission.segments){
  const entrances=new Map(segment.rooms.map(room=>[room.id,[]]));
  for(const wall of segment.architecture?.partitions||[]){
   if(wall.opening)for(const id of wall.regions)entrances.get(id)?.push(wall.opening.position);
  }
  for(const tunnel of segment.tunnels){
   entrances.get(tunnel.from)?.push(tunnel.toPosition);
   entrances.get(tunnel.to)?.push(tunnel.fromPosition);
  }
  for(const door of segment.architecture?[]:segment.doors)entrances.get(door.roomId)?.push(door.position);
  const routeSpans=caveRouteSpans(segment.tunnels);
  for(const room of segment.rooms)furnishRoom(room,mission.settings,registry,mission.seed,entrances.get(room.id),routeSpans);
 }
 updateAssetReferences(mission);
 return mission;
}
function updateAssetReferences(mission){
 mission.assetReferences=[...new Set(mission.segments.flatMap(s=>s.rooms.flatMap(r=>r.props.map(p=>p.familyId))))].sort();
}

function segmentHitsBox(from,to,box,clearance){
 let lo=0,hi=1;
 for(const [axis,dimension] of [['x','w'],['z','d']]){
  const half=box[dimension]/2+clearance,min=box[axis]-half,max=box[axis]+half;
  const delta=to[axis]-from[axis];
  if(delta===0){if(from[axis]<min||from[axis]>max)return false;continue}
  const a=(min-from[axis])/delta,b=(max-from[axis])/delta;
  lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));
  if(lo>hi)return false;
 }
 return true;
}
function makeInteraction(mission,segment,room,{id,label,kind='terminal',grants=[],description=''}){
 const pos={...room.center};
 const obj={id,segmentId:segment.id,roomId:room.id,position:pos,label,kind,grants,requires:[],description};segment.interactables.push(obj);return obj;
}
export function generateMission(rawConfig={},catalog=BUILTIN_ASSETS){
 const cfg=normalizeConfig(rawConfig);
 const height=cfg.ceilingHeight||SCALES[cfg.scale].height;
 const transfer=cfg.transferKind==='auto'?(cfg.archetype==='cave'?'mine_lift':'elevator'):cfg.transferKind;
 const transferLabel=transfer.replace('_',' ');
 const mission={schemaVersion:SCHEMA,generator:{name:'B Remastered Zone Mission Studio',version:VERSION},identity:{id:`mission-${cfg.archetype}-${cfg.seed}`,label:`${ARCHETYPES[cfg.archetype].label} · Seed ${cfg.seed}`,revision:null},coordinateSpace:'right-handed-y-up-meters',gameCoordinateSpace:'z-up-b-game-units',axisMapping:'x,y,z (metres) → x,-z,y (B game units)',bUnitsPerMeter:B_UNITS_PER_METER,seed:cfg.seed,settings:cfg,archetype:cfg.archetype,theme:cfg.theme,condition:cfg.condition,exteriorBinding:{mode:'logical-entry-only',constraintsFromExterior:false,entryAnchorId:'world-entrance',returnAnchorId:'world-return'},instancePolicy:{authority:'server',partyShared:true,segmentStreaming:'eligible',playerState:'per-player',worldBinding:'explicit'},segments:[],transitions:[],objectives:[],encounters:[],navigation:{nodes:[],edges:[]},assetReferences:[],validation:null};
 for(let i=0;i<cfg.floors;i++){
  const s={id:`seg-${String(i+1).padStart(2,'0')}`,index:i,label:`${cfg.archetype==='cave'?'Depth':'Level'} ${i+1}`,archetype:cfg.archetype,environment:{condition:cfg.condition,theme:cfg.theme,lighting:cfg.lighting,ambientPreset:cfg.archetype==='cave'?'subterranean':'interior',ceilingHeightMeters:height},rooms:[],corridors:[],tunnels:[],doors:[],interactables:[],anchors:null,bounds:null,architecturalHeight:height};
  const sr=rng(hash32(`${cfg.seed}|seg|${i}|${cfg.archetype}|${cfg.rooms}|${cfg.branches}|${cfg.segmentSeeds[i]||0}`));
  cfg.archetype==='cave'?genCaveSegment(s,cfg,sr):buildInterior(s,cfg,sr,makeRoom);mission.segments.push(s);
 }
 // Lock some internal doors. Keys always appear in earlier, initially accessible rooms.
 for(let si=0;si<mission.segments.length;si++){
  const seg=mission.segments[si],lockedCandidate=seg.rooms.filter((r,i)=>r.doorId&&r.regionType==='enclosed_room'&&i>Math.floor(seg.rooms.length*.35));
  const securityRoom=room=>/secure|security|archive|server|evidence|custody|containment|armory|isolation/i.test(room.name+' '+room.department);
  lockedCandidate.sort((a,b)=>Number(securityRoom(b))-Number(securityRoom(a)));
  const num=cfg.archetype==='cave'?0:Math.min(cfg.locks,lockedCandidate.length);
  for(let j=0;j<num;j++){
   const target=lockedCandidate[j];
   const door=seg.doors.find(d=>d.id===target.doorId);
   const key=`clearance-${seg.id}-${j+1}`;door.kind=j%2?'security':'keycard';door.requires=[key];door.lockedInitially=true;door.state='closed';
   const source=seg.rooms[Math.min(j+1,Math.floor(seg.rooms.length*.30))];
   makeInteraction(mission,seg,source,{id:`${seg.id}-key-${j+1}`,label:j%2?'Disable security lock':'Collect security keycard',kind:j%2?'terminal':'keycard',grants:[key],description:`Unlocks ${target.name}`});
  }
 }
 // Elevators and portals belong to the logical mission graph, not a physical shaft.
 for(let i=0;i<mission.segments.length-1;i++){
  const a=mission.segments[i],b=mission.segments[i+1];const grant=`access-${b.id}`;
  const room=a.rooms[Math.max(1,Math.floor(a.rooms.length*.22))];
  const restricted=cfg.transitionSecurity==='keycard'||cfg.progression!=='explore';
  if(cfg.progression==='boss'){
   const arena=a.rooms.findLast(r=>r.phase==='landmark')||a.rooms.at(-1);
   mission.objectives.push({id:`objective-${a.id}-boss`,type:'boss_checkpoint',label:`Secure ${arena.name}`,segmentId:a.id,roomId:arena.id,position:arena.center,requires:[],grants:[grant],mandatory:true,state:'pending'});
  }else if(restricted)makeInteraction(mission,a,room,{id:`${a.id}-lift-access`,label:`Enable ${transferLabel} access`,kind:'terminal',grants:[grant],description:`Enables travel to ${b.label}`});
  mission.transitions.push({id:`link-${i+1}-up`,fromSegmentId:a.id,toSegmentId:b.id,fromAnchor:a.anchors.exit,toAnchor:b.anchors.entry,kind:transfer,label:`${transferLabel} → ${b.label}`,requires:restricted?[grant]:[],direction:'forward',spawnFacing:0});
  mission.transitions.push({id:`link-${i+1}-down`,fromSegmentId:b.id,toSegmentId:a.id,fromAnchor:b.anchors.entry,toAnchor:a.anchors.exit,kind:transfer,label:`${transferLabel} → ${a.label}`,requires:[],direction:'return',spawnFacing:Math.PI});
 }
 if(cfg.floors>=3&&cfg.teleports&&cfg.progression==='explore'&&cfg.transitionSecurity==='open'){const a=mission.segments[0],b=mission.segments[mission.segments.length-1];
  const key='service-shortcut';const first=a.rooms[Math.min(2,a.rooms.length-1)];
  makeInteraction(mission,a,first,{id:'shortcut-activation',label:'Activate maintenance shortcut',kind:'terminal',grants:[key],description:'Unlocks an optional cross-segment shortcut'});
  mission.transitions.push({id:'optional-shortcut-out',fromSegmentId:a.id,toSegmentId:b.id,fromAnchor:a.anchors.entry,toAnchor:b.anchors.exit,kind:'portal',label:'Service passage (shortcut)',requires:[key],direction:'shortcut',spawnFacing:Math.PI/2});
  mission.transitions.push({id:'optional-shortcut-back',fromSegmentId:b.id,toSegmentId:a.id,fromAnchor:b.anchors.exit,toAnchor:a.anchors.entry,kind:'portal',label:'Return through passage',requires:[],direction:'return',spawnFacing:0});
 }
 // Optional same-segment teleport pads. Destinations are logically linked spawn anchors.
 if(cfg.teleports){for(const seg of mission.segments){
  mission.transitions.push({id:`${seg.id}-local-shortcut`,fromSegmentId:seg.id,toSegmentId:seg.id,fromAnchor:seg.anchors.entry,toAnchor:seg.anchors.exit,kind:'teleport_pad',label:'Internal service teleport',requires:[],direction:'local',spawnFacing:0});
  mission.transitions.push({id:`${seg.id}-local-return`,fromSegmentId:seg.id,toSegmentId:seg.id,fromAnchor:seg.anchors.exit,toAnchor:seg.anchors.entry,kind:'teleport_pad',label:'Return service teleport',requires:[],direction:'local-return',spawnFacing:Math.PI});
 }}
 const last=mission.segments.at(-1),final=last.rooms.findLast(r=>r.phase==='landmark')||last.rooms.at(-1);
 mission.objectives.push({id:'objective-primary',type:cfg.progression==='boss'?'boss_checkpoint':'interact',label:cfg.archetype==='cave'?'Secure the underground chamber':'Secure the final objective',segmentId:last.id,roomId:final.id,position:{...final.center},requires:[],mandatory:true,state:'pending'});
 const first=mission.segments[0];mission.objectives.push({id:'objective-explore',type:'reach',label:'Enter and investigate the mission',segmentId:first.id,roomId:first.rooms[0].id,position:{...first.rooms[0].center},requires:[],mandatory:false,state:'pending'});
 if(cfg.assignmentSeed)assignRoomNames(mission);
 populateEncounters(mission);
 syncNavigation(mission);
 decorateMission(mission,catalog);mission.validation=validateMission(mission);
 mission.identity.revision=hash32(JSON.stringify({...cfg,segments:mission.segments.map(s=>s.rooms.length),transitions:mission.transitions.length})).toString(16).padStart(8,'0');return mission;
}
export function validateMission(mission){
 const errors=[],warnings=[],segById=new Map(),rooms=new Map(),doorByRoom=new Map();let count=0;
 if(mission?.schemaVersion!==SCHEMA)errors.push('Unsupported mission schema');
 if(!Array.isArray(mission?.segments)||!mission.segments.length)return {ok:false,errors:['No mission segments defined'],warnings:[],reachableSegments:[],reachableRooms:[],grants:[]};
 const ids=new Set();const checkId=id=>{if(!id||ids.has(id))errors.push(`Missing or duplicate identifier: ${id}`);ids.add(id)};
 for(const seg of mission.segments){checkId(seg.id);segById.set(seg.id,seg);if(!seg.anchors?.entry||!seg.anchors?.exit)errors.push(`Missing anchor in ${seg.id}`);
  if(!Array.isArray(seg.rooms)||!seg.rooms.length)errors.push(`No rooms in ${seg.id}`);
  for(const r of seg.rooms){checkId(r.id);rooms.set(r.id,r);count++;if(r.shape==='rect'&&(!r.bounds||r.bounds.w<2||r.bounds.d<2))errors.push(`Bad dimensions: ${r.id}`);if(r.shape==='cavern'&&(!Array.isArray(r.polygon)||r.polygon.length<5))errors.push(`Invalid cave polygon: ${r.id}`);}
  for(const d of seg.doors){checkId(d.id);if(!rooms.has(d.roomId))errors.push(`Door room missing: ${d.id}`);doorByRoom.set(d.roomId,d);}
  for(const i of seg.interactables){checkId(i.id);if(!rooms.has(i.roomId))errors.push(`Interaction room missing: ${i.id}`)}
  if(seg.terrain){
   const connected=new Map(seg.rooms.map(room=>[room.id,[]]));
   for(const tunnel of seg.tunnels){
    const points=tunnelPath(tunnel);
    if(!points.slice(1).every((point,i)=>canCrossTerrain(seg.terrain,points[i],point))){
     errors.push(`Terrain blocks tunnel: ${tunnel.id}`);
     continue;
    }
    connected.get(tunnel.from)?.push(tunnel.to);
    connected.get(tunnel.to)?.push(tunnel.from);
   }
   if(connected.size){
    const connectedRooms=new Set([seg.rooms[0].id]);
    for(const room of connectedRooms)for(const target of connected.get(room)||[])connectedRooms.add(target);
    for(const room of seg.rooms)if(!connectedRooms.has(room.id)||!sampleTerrain(seg.terrain,room.center))errors.push(`Cave room lacks a walkable route: ${room.id}`);
   }
   for(const name of ['entry','exit','safeSpawn']){
    const point=seg.anchors?.[name];
    if(!point||!canCrossTerrain(seg.terrain,point,point))errors.push(`Anchor outside walkable cave terrain: ${seg.id}/${name}`);
   }
  }
  if(seg.architecture){
   const regions=new Set([...seg.rooms,...seg.corridors].map(area=>area.id));
   const doorIds=new Set(seg.doors.map(door=>door.id));
   for(const wall of seg.architecture.partitions){
    checkId(wall.id);
    const length=Math.hypot(wall.b.x-wall.a.x,wall.b.z-wall.a.z);
    if(!Number.isFinite(length)||length<=0||(wall.a.x!==wall.b.x&&wall.a.z!==wall.b.z)||wall.regions.some(id=>id!==null&&!regions.has(id)))errors.push(`Invalid partition: ${wall.id}`);
    if(!wall.opening)continue;
    const {width,position,doorId}=wall.opening;
    const horizontal=wall.a.z===wall.b.z,axis=horizontal?'x':'z',normal=horizontal?'z':'x';
    if(wall.regions.some(id=>!id)||!Number.isFinite(width)||width<.8||
      position[normal]!==wall.a[normal]||position[axis]-width/2<wall.a[axis]-.001||
      position[axis]+width/2>wall.b[axis]+.001||(doorId&&!doorIds.has(doorId)))errors.push(`Invalid opening clearance: ${wall.id}`);
   }
   for(const name of ['entry','exit','safeSpawn'])if(!seg.anchors?.[name]||!areaAt(seg,seg.anchors[name]))errors.push(`Anchor outside walkable floor: ${seg.id}/${name}`);
  }
 }
 for(const t of mission.transitions){
  checkId(t.id);
  const from=segById.get(t.fromSegmentId),to=segById.get(t.toSegmentId);
  if(!from||!to)errors.push(`Broken portal destination: ${t.id}`);
  if(!t.toAnchor||!t.fromAnchor)errors.push(`Missing teleport anchor: ${t.id}`);
  else if((from?.architecture&&!areaAt(from,t.fromAnchor))||
      (to?.architecture&&!areaAt(to,t.toAnchor))||
      (from?.terrain&&!canCrossTerrain(from.terrain,t.fromAnchor,t.fromAnchor))||
      (to?.terrain&&!canCrossTerrain(to.terrain,t.toAnchor,t.toAnchor)))errors.push(`Transition anchor outside walkable floor: ${t.id}`);
 }
 for(const enc of mission.encounters||[]){checkId(enc.id);if(!rooms.has(enc.roomId))errors.push(`Encounter room missing: ${enc.id}`)}
 const navNodes=new Set((mission.navigation?.nodes||[]).map(n=>n.id));
 for(const e of mission.navigation?.edges||[]){checkId(e.id);if(!navNodes.has(e.from)||!navNodes.has(e.to))errors.push(`Broken navigation edge: ${e.id}`)}
 for(const o of mission.objectives){checkId(o.id);if(!rooms.has(o.roomId)||!segById.has(o.segmentId))errors.push(`Missing objective location: ${o.id}`);}
 // Fixed-point reachability: collect all obtainable grants; unlock newly available doors/links; repeat.
 const reached=new Map([[mission.segments[0].id,[mission.segments[0].anchors?.entry]]]),reachableRooms=new Set(),grants=new Set();
 const fulfilled=requirements=>(requirements||[]).every(key=>grants.has(key));
 let changed=true,steps=0;
 while(changed&&steps++<100){changed=false;
  const areasBySegment=new Map();
  for(const [id,anchors] of reached){
   const s=segById.get(id);if(!s)continue;
   let areas;
   if(s.architecture){
    areas=new Set(anchors.filter(Boolean).map(anchor=>areaAt(s,anchor)).filter(Boolean));
    const links=new Map();
    const doors=new Map(s.doors.map(door=>[door.id,door]));
    for(const wall of s.architecture.partitions){
     if(!wall.opening||wall.opening.width<.8||!fulfilled(doors.get(wall.opening.doorId)?.requires))continue;
     const [a,b]=wall.regions;
     if(!a||!b)continue;
     if(!links.has(a))links.set(a,[]);
     if(!links.has(b))links.set(b,[]);
     links.get(a).push(b);links.get(b).push(a);
    }
    for(const area of areas)for(const neighbor of links.get(area)||[])areas.add(neighbor);
    areasBySegment.set(id,areas);
   }
   for(const room of s.rooms){
    if(areas?!areas.has(room.id):!fulfilled(doorByRoom.get(room.id)?.requires))continue;
    reachableRooms.add(room.id);
   }
   for(const item of [...s.interactables,...mission.objectives.filter(o=>o.segmentId===id)]){
    if(!reachableRooms.has(item.roomId)||!fulfilled(item.requires))continue;
    for(const grant of item.grants||[])if(!grants.has(grant)){grants.add(grant);changed=true;}
   }
  }
  for(const t of mission.transitions){
   if(!reached.has(t.fromSegmentId)||!fulfilled(t.requires)||!t.fromAnchor||!t.toAnchor)continue;
   const areas=areasBySegment.get(t.fromSegmentId);
   if(areas&&!areas.has(areaAt(segById.get(t.fromSegmentId),t.fromAnchor)))continue;
   if(!reached.has(t.toSegmentId))reached.set(t.toSegmentId,[]);
   const anchors=reached.get(t.toSegmentId);
   if(!anchors.some(p=>p&&p.x===t.toAnchor.x&&p.z===t.toAnchor.z)){anchors.push(t.toAnchor);changed=true;}
  }
 }
 if(steps>=100)warnings.push('Progression analysis reached iteration limit');
 for(const s of mission.segments)if(!reached.has(s.id))errors.push(`Unreachable segment: ${s.id}`);
 for(const o of mission.objectives)if(o.mandatory&&(!reachableRooms.has(o.roomId)||!fulfilled(o.requires)))errors.push(`Unreachable mandatory objective: ${o.id}`);
 for(const t of mission.transitions)if(!(t.requires||[]).every(k=>grants.has(k)))warnings.push(`Unavailable optional transition: ${t.id}`);
 for(const s of mission.segments)for(const d of s.doors)if(!(d.requires||[]).every(k=>grants.has(k)))warnings.push(`Locked doorway lacks obtainable grant: ${d.id}`);
 if(mission.exteriorBinding?.constraintsFromExterior!==false)errors.push('Exterior binding must not constrain mission dimensions');
 return {ok:errors.length===0,errors,warnings,reachableSegments:[...reached.keys()].sort(),reachableRooms:[...reachableRooms].sort(),grants:[...grants].sort(),totals:{segments:mission.segments.length,rooms:count,transitions:mission.transitions.length,props:mission.segments.reduce((n,s)=>n+s.rooms.reduce((m,r)=>m+r.props.length,0),0)}};
}
export function assignRoomNames(mission){
 for(const segment of mission.segments)for(const room of segment.rooms){
  if(room.manual)continue;
  const archetype=ARCHETYPES[segment.archetype];
  const random=rng(hash32(`${mission.seed}|assignment|${mission.settings.assignmentSeed}|${room.id}`));
  const landmark=room.phase==='landmark';
  room.name=departmentRoomName(segment.archetype,room.department,landmark,random())||
   choose(random,landmark?archetype.landmarks:archetype.rooms);
 }
 return mission;
}

export function populateEncounters(mission){
 const cfg=mission.settings;
 mission.encounters=[];
 for(const seg of mission.segments){
  const boss=mission.objectives.find(o=>o.type==='boss_checkpoint'&&o.segmentId===seg.id);
  const candidates=seg.rooms.filter((r,i)=>i>1&&i%3!==0&&r.id!==boss?.roomId).sort((a,b)=>(b.phase==='landmark')-(a.phase==='landmark'));
  const amount=Math.min(candidates.length,Math.round(candidates.length*cfg.encounterDensity/100*.5));
  const er=rng(hash32(`${cfg.seed}|encounter|${cfg.encounterSeed}|${seg.id}`));
  if(cfg.encounterSeed)for(let i=candidates.length-1;i>0;i--){
   const j=randomInt(er,0,i);
   [candidates[i],candidates[j]]=[candidates[j],candidates[i]];
  }
  for(let i=0;i<amount;i++){
   const room=candidates[Math.floor((i+.5)*candidates.length/Math.max(1,amount))];if(!room)continue;
   mission.encounters.push({id:`${seg.id}-encounter-${i+1}`,segmentId:seg.id,roomId:room.id,spawnAnchor:{...room.center},type:!boss&&i===amount-1&&seg.index===cfg.floors-1?'boss_candidate':'enemy_group',groupSize:randomInt(er,2,Math.min(16,Math.max(5,Math.floor((room.bounds?room.bounds.w*room.bounds.d:Math.PI*(room.radius||5)**2)/28)))),difficultyBand:Math.min(5,1+Math.floor((seg.index+1)/2)),npcArchetypeRef:null,powerSetRef:null,authority:'server',status:'metadata_only'});
  }
  if(boss)mission.encounters.push({id:`${seg.id}-boss`,segmentId:seg.id,roomId:boss.roomId,spawnAnchor:boss.position,type:'boss_candidate',groupSize:1,difficultyBand:Math.min(5,seg.index+2),npcArchetypeRef:null,powerSetRef:null,authority:'server',status:'metadata_only'});
 }
 return mission;
}

/** Rebuild current navigation from physical openings and keep legacy navigation edges intact. */
export function syncNavigation(mission){
 const old=mission.navigation||{nodes:[],edges:[]};
 const legacy=new Set(mission.segments.filter(s=>!s.architecture&&s.archetype!=='cave').map(s=>s.id));
 const nodes=(old.nodes||[]).filter(node=>legacy.has(node.segmentId));
 const legacyNodes=new Set(nodes.map(node=>node.id));
 const edges=(old.edges||[]).filter(edge=>legacyNodes.has(edge.from)&&legacyNodes.has(edge.to)&&edge.kind!=='inter_segment_transition');
 for(const segment of mission.segments){
  const doors=new Map(segment.doors.map(door=>[door.id,door]));
  if(legacy.has(segment.id)){
   for(const edge of edges)if(doors.has(edge.doorId))edge.requires=[...doors.get(edge.doorId).requires];
   continue;
  }
  const node=(id,type,position)=>nodes.push({id,segmentId:segment.id,type,position:terrainPosition(segment,P(position.x,position.z))});
  const entry=segment.architecture?.entryRegionId||segment.rooms[0].id;
  node(segment.id,'segment_entry',segment.anchors.entry);
  edges.push({id:`nav-${segment.id}-entry`,from:segment.id,to:entry,bidirectional:true,requires:[],kind:'segment_entry'});
  for(const area of segment.corridors)node(area.id,'corridor',area.bounds);
  for(const room of segment.rooms)node(room.id,room.shape==='cavern'?'cavern':'room',room.center);
  for(const tunnel of segment.tunnels)edges.push({id:`nav-${tunnel.id}`,from:tunnel.from,to:tunnel.to,bidirectional:true,requires:[],kind:'natural_tunnel',width:tunnel.width,path:tunnel.path});
  for(const wall of segment.architecture?.partitions||[]){
   if(!wall.opening)continue;
   const door=doors.get(wall.opening.doorId);
   edges.push({id:`nav-${wall.id}`,from:wall.regions[0],to:wall.regions[1],bidirectional:true,requires:[...(door?.requires||[])],kind:door?'doorway':'open_passage',doorId:door?.id||null,partitionId:wall.id,width:wall.opening.width});
  }
 }
 for(const t of mission.transitions)edges.push({id:`nav-${t.id}`,from:t.fromSegmentId,to:t.toSegmentId,bidirectional:false,requires:[...(t.requires||[])],kind:'inter_segment_transition',transitionId:t.id});
 mission.navigation={nodes,edges};
 return mission.navigation;
}

export function rerollSegment(mission,segmentId,catalog=BUILTIN_ASSETS){
 const old=mission.segments.find(segment=>segment.id===segmentId);
 if(!old||mission.generator.version!==VERSION)throw Error('Generate a current mission before rerolling its layout');
 const segmentSeeds=[...mission.settings.segmentSeeds];
 segmentSeeds[old.index]=(segmentSeeds[old.index]||0)+1;
 const candidate=generateMission({...mission.settings,segmentSeeds},catalog);
 const replacement=candidate.segments[old.index];
 const reanchor=(anchor,fallback)=>{
  const same=(a,b)=>a&&b&&a.x===b.x&&a.z===b.z;
  const name=Object.keys(old.anchors).find(key=>same(old.anchors[key],anchor));
  if(name)return replacement.anchors[name];
  const oldRoom=old.rooms.find(room=>same(room.center,anchor));
  const room=oldRoom&&replacement.rooms.find(room=>room.id===oldRoom.id);
  return room?.center||(anchor&&areaAt(replacement,anchor)?anchor:replacement.anchors[fallback]);
 };
 for(const transition of mission.transitions){
  if(transition.fromSegmentId===segmentId)transition.fromAnchor=reanchor(transition.fromAnchor,'exit');
  if(transition.toSegmentId===segmentId)transition.toAnchor=reanchor(transition.toAnchor,'entry');
 }
 mission.settings.segmentSeeds=candidate.settings.segmentSeeds;
 mission.segments[old.index]=replacement;
 for(const field of ['objectives','encounters'])mission[field]=[...mission[field].filter(item=>item.segmentId!==segmentId),...candidate[field].filter(item=>item.segmentId===segmentId)];
 updateAssetReferences(mission);
 syncNavigation(mission);
 mission.validation=validateMission(mission);
 return mission;
}
export function graphSummary(mission){return mission.segments.map(s=>({id:s.id,label:s.label,rooms:s.rooms.length,objects:s.interactables.length,outgoing:mission.transitions.filter(t=>t.fromSegmentId===s.id).map(t=>({id:t.id,to:t.toSegmentId,kind:t.kind,locked:t.requires.length>0}))}))}
export function findNearby(mission,segmentId,pos,radius=3.5){const seg=mission.segments.find(s=>s.id===segmentId);if(!seg)return[];
 return [...seg.interactables.map(x=>({...x,targetType:'interaction'})),...seg.doors.filter(x=>x.state!=='open'||x.requires.length).map(x=>({...x,label:x.kind==='standard'?'Open / close door':`Unlock ${x.kind} door`,targetType:'door'})),...mission.transitions.filter(t=>t.fromSegmentId===segmentId).map(t=>({...t,position:t.fromAnchor,targetType:'transition'})),...mission.objectives.filter(o=>o.segmentId===segmentId).map(o=>({...o,targetType:'objective'}))].map(x=>({...x,distance:Math.hypot(x.position.x-pos.x,x.position.z-pos.z)})).filter(x=>x.distance<=radius).sort((a,b)=>a.distance-b.distance);
}
export function canMove(segment,from,to,openDoorIds=new Set()){
 if(!segment)return false;
 if(segment.rooms.some(room=>room.columns?.some(column=>segmentHitsBox(from,to,column,.22))))return false;
 if(segment.rooms.some(room=>room.props.some(prop=>prop.collidable&&prop.footprint&&
  !insideRect(from,prop.footprint,.22)&&segmentHitsBox(from,to,prop.footprint,.22))))return false;
 if(segment.architecture)return Boolean(areaAt(segment,to))&&moveThroughInterior(segment,from,to,openDoorIds);
 if(segment.terrain)return canCrossTerrain(segment.terrain,from,to);
 if(segment.archetype==='cave'){
  const steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/.25));
  for(let i=1;i<=steps;i++)if(!areaAt(segment,{x:from.x+(to.x-from.x)*i/steps,z:from.z+(to.z-from.z)*i/steps}))return false;
  return true;
 }
 const rooms=segment.rooms.filter(r=>r.shape==='rect');
 const a=rooms.find(r=>insideRect(from,r.bounds));
 const b=rooms.find(r=>insideRect(to,r.bounds));
 const h0=segment.corridors.some(c=>insideRect(from,c.bounds));
 const h1=segment.corridors.some(c=>insideRect(to,c.bounds));
 if(a&&b&&a.id===b.id)return true;
 if(h0&&h1&&!b&&!a)return true;
 // Crossing from a hallway into a room (or vice versa) is only legal at an opened doorway.
 const room=a||b;
 if(room&&(h0||h1)){
  const door=segment.doors.find(d=>d.id===room.doorId);
  if(!door||!openDoorIds.has(door.id))return false;
  const parallel=door.side==='south'||door.side==='north'
   ?Math.abs(from.x-door.position.x)<door.width*.43&&Math.abs(to.x-door.position.x)<door.width*.43
   :Math.abs(from.z-door.position.z)<door.width*.43&&Math.abs(to.z-door.position.z)<door.width*.43;
  return Boolean(parallel && (h0||h1) && (a||b));
 }
 return false;
}

export function serializeMission(mission){
 const data=deepCopy(mission);for(const t of data.transitions){const a=data.segments.find(s=>s.id===t.fromSegmentId),b=data.segments.find(s=>s.id===t.toSegmentId);if(a?.terrain&&t.fromAnchor)t.fromAnchor=terrainPosition(a,t.fromAnchor);if(b?.terrain&&t.toAnchor)t.toAnchor=terrainPosition(b,t.toAnchor);}syncNavigation(data);updateAssetReferences(data);data.validation=validateMission(data);
 data.identity.revision=hash32(JSON.stringify({settings:data.settings,segments:data.segments,transitions:data.transitions,objectives:data.objectives,encounters:data.encounters})).toString(16).padStart(8,'0');
 return data;
}
export function importMission(data){if(!data||data.schemaVersion!==SCHEMA)throw new Error('Not a b.zone-mission.v1 blueprint');if(!Array.isArray(data.segments)||!Array.isArray(data.transitions))throw new Error('Missing mission segment or transition data');const m=deepCopy(data);m.settings=normalizeConfig(m.settings);
 for(const segment of m.segments)if(segment.terrain&&!checkCaveTerrain(segment.terrain))throw new Error(`Invalid terrain mesh in ${segment.id}`);
 for(const segment of m.segments)if(!segment.architecture){
  const byRoom=new Map(segment.rooms.map(room=>[room.id,room]));
  for(const door of segment.doors){
   const room=byRoom.get(door.roomId);
   if(room?.bounds&&['north','south'].includes(door.side)){
    door.side=door.position.z<room.bounds.z?'north':'south';
    room.doorSide=door.side;
   }
  }
 }
 m.validation=validateMission(m);return m}
