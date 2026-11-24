import { readFileSync } from 'node:fs';
import { wallPieces } from './architecture.js';
import { caveBoundary, tunnelPolygon } from './cave-geometry.js';
import { canCrossTerrain, sampleTerrain, terrainPosition, tunnelPath } from './cave-terrain.js';
import { ARCHETYPE_PRESETS, SCENARIOS } from './presets.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {SCHEMA,ARCHETYPES,generateMission,validateMission,importMission,serializeMission,registryFromBlueprints,BUILTIN_ASSETS,canMove,areaAt,decorateMission,rerollSegment,placeRoomAsset} from './mission-core.js';
const cfg=(archetype='office',seed=1234,extras={})=>({archetype,seed,rooms:18,floors:3,branches:1,locks:2,loops:1,clutter:38,...extras});
const combo=[];
for(const archetype of Object.keys(ARCHETYPES))for(const seed of [1,7,818,99995])for(const floors of [1,3,5])combo.push([archetype,seed,floors]);

test('128 building configurations share single, traversable partition openings on contiguous floors',()=>{
 for(const archetype of ['office','laboratory','precinct','hospital'])
 for(const layout of ['spine','cross','loop','campus'])
 for(const scale of ['compact','standard','expansive','massive'])
 for(const seed of [3,807]){
  const mission=generateMission(cfg(archetype,seed,{layout,scale,floors:1,rooms:seed===3?7:32,locks:0,openness:90,corridorWidth:seed===3?0:6.7}));
  const message=`${archetype}, ${layout}, ${scale}, ${seed}`;
  assert.ok(mission.validation.ok,`${message}: ${mission.validation.errors}`);
  const segment=mission.segments[0],areas=[...segment.rooms,...segment.corridors];
  assert.equal(mission.validation.reachableRooms.length,segment.rooms.length,message);
  for(const [index,a] of areas.entries())for(const b of areas.slice(index+1)){
   assert.ok(Math.abs(a.bounds.x-b.bounds.x)>=(a.bounds.w+b.bounds.w)/2-1e-6||
    Math.abs(a.bounds.z-b.bounds.z)>=(a.bounds.d+b.bounds.d)/2-1e-6,`Overlapping rooms: ${a.id}, ${b.id}`);
  }
  const partitionKeys=new Set();
  for(const wall of segment.architecture.partitions){
   const key=JSON.stringify([wall.a,wall.b]);
   assert.ok(!partitionKeys.has(key),`Duplicate partition: ${key}`);
   partitionKeys.add(key);
   const horizontal=wall.a.z===wall.b.z,normal=horizontal?'z':'x';
   const cross=(point,side)=>({...point,[normal]:point[normal]+side*.12});
   if(wall.opening){
    const p=wall.opening.position;
    const door=segment.doors.find(door=>door.id===wall.opening.doorId);
    const opened=new Set(door?[door.id]:[]);
    assert.equal(areaAt(segment,cross(p,-1)),wall.regions[0],message);
    assert.equal(areaAt(segment,cross(p,1)),wall.regions[1],message);
    assert.ok(canMove(segment,cross(p,-1),cross(p,1),opened),`Blocked opening ${wall.id}: ${message}`);
    if(!door||door.state==='open')assert.ok(canMove(segment,cross(p,1),cross(p,-1)),message);
    for(const [side,region] of wall.regions.entries()){
     const room=segment.rooms.find(room=>room.id===region);
     if(room)assert.ok(canMove(segment,room.center,cross(p,side===0?-1:1),opened),`Blocked approach ${wall.id}: ${message}`);
    }
   }
   for(const [a,b] of wallPieces(wall)){
    const midpoint={x:(a.x+b.x)/2,z:(a.z+b.z)/2};
    assert.equal(canMove(segment,cross(midpoint,-1),cross(midpoint,1)),false,`Wall leak ${wall.id}: ${message}`);
   }
  }
 }
});

test('expansive defaults have broad open routes and massive plans scale independently of segment count',()=>{
 const mission=generateMission();
 const compact=generateMission({scale:'compact'}).segments[0],massive=generateMission({scale:'massive'}).segments[0];
 const segment=mission.segments[0],area=s=>s.rooms.reduce((n,r)=>n+r.bounds.w*r.bounds.d,0);
 assert.equal(mission.segments.length,1);
 assert.equal(mission.transitions.length,0);
 assert.ok(segment.doors.filter(door=>door.state==='open').length>segment.doors.length/2);
 assert.ok(segment.corridors.find(c=>c.kind==='main').bounds.d>=8);
 assert.ok(area(massive)>area(compact)*8);
 assert.ok(massive.rooms.some(r=>r.phase==='landmark'&&r.bounds.w>=40&&r.bounds.d>=20));
});

test('a floor area target adjusts bay spans without changing circulation width or floor count',()=>{
 const mission=generateMission({targetArea:18000,bayWidth:15,roomDepth:18,corridorWidth:7.5,rooms:18,floors:2});
 assert.ok(mission.validation.ok);
 assert.equal(mission.segments.length,2);
 for(const segment of mission.segments){
  const area=[...segment.rooms,...segment.corridors].reduce((sum,region)=>sum+region.bounds.w*region.bounds.d,0);
  assert.ok(Math.abs(area-18000)<.01);
  assert.equal(segment.corridors[0].bounds.d,7.5);
 }
});

test('manual objects get a collision footprint and appear in exported asset references',()=>{
 const mission=generateMission({clutter:0});
 const segment=mission.segments[0],room=segment.rooms.find(room=>room.phase==='landmark');
 const asset={id:'custom-case',width:.8,depth:.8,source:'b.city-object.v1'};
 assert.ok(placeRoomAsset(segment,room,asset));
 const [prop]=room.props;
 assert.equal(prop.footprint.w,.8);
 assert.ok(serializeMission(mission).assetReferences.includes(asset.id));
 assert.ok(!placeRoomAsset(segment,room,{...asset,width:100}));
});

test('building progression fails when a mandatory room loses its physical opening',()=>{
 const mission=generateMission({layout:'spine',loops:0,openness:0});
 const segment=mission.segments[0];
 const objective=mission.objectives.find(o=>o.mandatory);
 for(const wall of segment.architecture.partitions)if(wall.regions.includes(objective.roomId))wall.opening=null;
 assert.ok(validateMission(mission).errors.some(error=>error.includes('Unreachable mandatory objective')));
});

test('boss checkpoints gate transfers without simulating combat',()=>{
 const mission=generateMission({progression:'boss',floors:5,teleports:true});
 const checkpoints=mission.objectives.filter(o=>o.type==='boss_checkpoint');
 assert.equal(checkpoints.length,5);
 assert.equal(mission.transitions.some(t=>t.direction==='shortcut'),false);
 assert.ok(mission.transitions.filter(t=>t.direction==='forward').every(t=>checkpoints.some(o=>o.grants?.includes(t.requires[0]))));
 assert.equal(mission.validation.ok,true);
 mission.objectives=mission.objectives.filter(o=>o!==checkpoints[0]);
 assert.ok(validateMission(mission).errors.some(error=>error.includes('Unreachable segment')));
});

test('massive cavern tunnel centerlines stay walkable and shared geometry has wall cutouts',()=>{
 const segment=generateMission({archetype:'cave',scale:'massive',rooms:52,branches:3,loops:3}).segments[0];
 assert.ok(segment.rooms.length>=45);
 const walls=caveBoundary(segment);
 assert.ok(walls.length>100);
 for(const tunnel of segment.tunnels){
  assert.equal(tunnelPolygon(tunnel).length,4);
  assert.ok(canMove(segment,tunnel.fromPosition,tunnel.toPosition),tunnel.id);
 }
});

test('legacy building imports preserve footprints and correct doorway facing',()=>{
 const original=JSON.parse(readFileSync(new URL('./examples/corporate-office-takeover.mission.json',import.meta.url)));
 const legacy=importMission(original);
 assert.equal(legacy.generator.version,'0.8.0');
 assert.equal(legacy.validation.ok,true);
 for(const [index,segment] of legacy.segments.entries()){
  assert.deepEqual(segment.rooms.map(r=>r.bounds),original.segments[index].rooms.map(r=>r.bounds));
  for(const door of segment.doors){
   const room=segment.rooms.find(r=>r.id===door.roomId);
   if(door.side==='north'||door.side==='south')assert.equal(door.side,door.position.z<room.bounds.z?'north':'south');
  }
 }
});

test('all building and cave presets remain valid through JSON round trips',()=>{
 for(const [name,archetype,settings] of SCENARIOS){
  const mission=generateMission({...ARCHETYPE_PRESETS[archetype],...settings,archetype});
  const reloaded=importMission(serializeMission(mission));
  assert.ok(reloaded.validation.ok,`${name}: ${reloaded.validation.errors}`);
  assert.deepEqual(reloaded.segments,mission.segments,name);
 }
});

test('cave floor, ceiling and rock walls form a closed indexed shell with real elevation and clearance',()=>{
 const {terrain}=generateMission({archetype:'cave',seed:413,caveElevation:45,caveVault:35}).segments[0];
 const edges=new Map(), winding=new Map();
 assert.ok(terrain.stats.elevationMax-terrain.stats.elevationMin>12);
 assert.ok(terrain.stats.roofMax>terrain.stats.elevationMax+10);
 assert.ok(terrain.formations.length>0);
 assert.ok(terrain.boundary.length>0);
 for(const layer of [terrain.floor,terrain.ceiling,terrain.walls]){
  assert.ok(layer.vertices.every(Number.isFinite));
  for(let i=0;i<layer.indices.length;i+=3){
   const points=layer.indices.slice(i,i+3).map(index=>{
    assert.ok(Number.isInteger(index)&&index>=0&&index*3+2<layer.vertices.length);
    return layer.vertices.slice(index*3,index*3+3).join(',');
   });
   assert.equal(new Set(points).size,3);
   for(const [a,b] of [[points[0],points[1]],[points[1],points[2]],[points[2],points[0]]]){
    const key=a<b?a+'|'+b:b+'|'+a;
    edges.set(key,(edges.get(key)||0)+1);
    winding.set(key,(winding.get(key)||0)+(a<b?1:-1));
   }
  }
 }
 assert.ok([...edges.values()].every(count=>count===2));
 assert.ok([...winding.values()].every(direction=>direction===0));
 for(let i=0;i<terrain.floor.vertices.length;i+=3){
  assert.ok(terrain.ceiling.vertices[i+1]-terrain.floor.vertices[i+1]>=terrain.navigation.minClearance-1e-5);
 }
 const wall=terrain.walls.vertices;
 assert.ok(Array.from({length:wall.length/12},(_,i)=>i*12).some(i=>wall[i]!==wall[i+3]||wall[i+2]!==wall[i+5]));
});

test('cave routes use the exported triangle heights, preserve headroom, and reject travel off the shell',()=>{
 const mission=generateMission({archetype:'cave',scale:'massive',seed:11,rooms:30,floors:2,caveElevation:42,caveTunnelWidth:10});
 assert.equal(mission.validation.ok,true);
 let changesHeight=false;
 for(const segment of mission.segments){
  for(const tunnel of segment.tunnels){
   const points=tunnelPath(tunnel);
   for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i];
    assert.ok(canCrossTerrain(segment.terrain,a,b),tunnel.id);
    changesHeight ||= Math.abs(a.y-b.y)>2;
    const position=terrainPosition(segment,{x:(a.x+b.x)/2,z:(a.z+b.z)/2});
    const sample=sampleTerrain(segment.terrain,position);
    assert.ok(Number.isFinite(position.y)&&sample.clearance>=segment.terrain.navigation.minClearance-.001);
   }
  }
  assert.equal(canMove(segment,segment.anchors.entry,{x:segment.bounds.minX-10,z:segment.bounds.minZ-10}),false);
 }
 assert.ok(changesHeight);
 const exported=serializeMission(mission);
 assert.ok(exported.transitions.every(t=>Number.isFinite(t.fromAnchor.y)&&Number.isFinite(t.toAnchor.y)));
 assert.deepEqual(importMission(exported).segments.map(s=>s.terrain),mission.segments.map(s=>s.terrain));
});

test('the mesh budget adapts or widens narrow passages rather than cutting mandatory routes',()=>{
 const mission=generateMission({archetype:'cave',scale:'massive',seed:132,rooms:72,caveTunnelWidth:7,caveTriangleSize:15,caveTunnelLength:2,caveElevation:70});
 const segment=mission.segments[0];
 assert.equal(mission.validation.ok,true);
 assert.ok(segment.terrain.stats.widenedTunnels>0);
 assert.ok(segment.terrain.stats.triangles<65000);
 assert.ok(segment.tunnels.every(t=>t.width>=7));
});

test('an invalid terrain import fails before navigation evaluates its indices',()=>{
 const mission=generateMission({archetype:'cave',seed:3,scale:'compact',rooms:7});
 mission.segments[0].terrain.floor.indices[0]=1e8;
 assert.throws(()=>importMission(mission),/Invalid terrain mesh in seg-01/);
});

test('optional ridges and pooled basins are real surfaces outside the protected passage network',()=>{
 const settings={archetype:'cave',seed:3,scale:'massive',caveLandforms:100,caveChamberScale:2.2,caveTriangleSize:2,rooms:25};
 const cave=generateMission({...settings,cavePools:true}).segments[0];
 const dry=generateMission({...settings,cavePools:false}).segments[0];
 assert.ok(cave.terrain.landforms.some(form=>form.kind==='ridge'));
 assert.ok(cave.terrain.navigation.steepTriangles.length>0);
 assert.ok(cave.terrain.water.indices.length>0);
 assert.deepEqual(cave.terrain.floor,dry.terrain.floor);
 assert.equal(dry.terrain.water,undefined);
 for(let i=0;i<cave.terrain.water.vertices.length;i+=3){
  const [x,y,z]=cave.terrain.water.vertices.slice(i,i+3);
  const floor=sampleTerrain(cave.terrain,{x,z});
  assert.ok(floor&&floor.y<=y+.001);
 }
});

test('segment rerolls preserve other floors, hand-edited content there, and transition reachability',()=>{
 const mission=generateMission({progression:'boss',floors:4});
 mission.segments[0].rooms[0].name='Hand-edit kept';
 mission.segments[0].rooms[0].manual=true;
 const untouched=JSON.stringify(mission.segments[0]),original=JSON.stringify(mission.segments[1]);
 rerollSegment(mission,'seg-02');
 assert.equal(JSON.stringify(mission.segments[0]),untouched);
 assert.notEqual(JSON.stringify(mission.segments[1]),original);
 assert.equal(mission.validation.ok,true);
 const replay=generateMission(mission.settings);
 assert.deepEqual(replay.segments[1].architecture,mission.segments[1].architecture);
 assert.equal(importMission(serializeMission(mission)).validation.ok,true);
});
test('all 60 archetype, seed and floor-count combinations generate valid mission graphs',()=>{
 for(const [a,seed,floors] of combo){const m=generateMission(cfg(a,seed,{floors}));assert.equal(m.segments.length,floors);const v=validateMission(m);assert.equal(v.ok,true,`${a} seed ${seed} floors ${floors}: ${v.errors.join(' | ')}`);assert.equal(v.reachableSegments.length,floors);assert.equal(v.totals.segments,floors);assert.ok(v.totals.rooms>0)}
});
test('identical settings reproduce the entire mission definition byte for byte',()=>{
 for(const a of Object.keys(ARCHETYPES)){const x=generateMission(cfg(a)),y=generateMission(cfg(a));assert.equal(JSON.stringify(x),JSON.stringify(y),a)}
});
test('a changed seed produces materially different spatial metadata',()=>{
 const a=generateMission(cfg('cave',111)),b=generateMission(cfg('cave',112));assert.notDeepEqual(a.segments[0].rooms[0].polygon,b.segments[0].rooms[0].polygon);
});
test('JSON round trip preserves rooms, transitions and mandatory objective reachability',()=>{
 for(const a of Object.keys(ARCHETYPES)){const m=generateMission(cfg(a));const re=importMission(JSON.parse(JSON.stringify(serializeMission(m))));assert.equal(re.validation.ok,true);assert.equal(re.segments.length,m.segments.length);assert.equal(re.transitions.length,m.transitions.length)}
});
test('building doorways are attached to their room walls',()=>{
 for(const a of ['office','laboratory','precinct','hospital']){const s=generateMission(cfg(a)).segments[0];for(const d of s.doors){const room=s.rooms.find(r=>r.id===d.roomId);assert.ok(room,'Missing matching door room');const b=room.bounds;const v=d.side==='north'?b.z-b.d/2:d.side==='south'?b.z+b.d/2:d.side==='west'?b.x-b.w/2:b.x+b.w/2;assert.ok(Math.abs((['north','south'].includes(d.side)?d.position.z:d.position.x)-v)<.01,`door not flush: ${d.id}`)}}
});
test('mission exit can target disconnected independent segment without spatial continuity',()=>{
 const m=generateMission(cfg('office',44,{floors:5}));const links=m.transitions.filter(t=>t.direction==='forward');assert.equal(links.length,4);assert.equal(m.exteriorBinding.constraintsFromExterior,false);assert.equal(m.exteriorBinding.mode,'logical-entry-only');assert.ok(links.every(t=>t.fromSegmentId!==t.toSegmentId));
});
test('removing an obtainable progression item makes mandatory final segment unreachable',()=>{
 const m=generateMission(cfg('office',44,{floors:3,loops:0,transitionSecurity:'keycard'}));m.segments[0].interactables=m.segments[0].interactables.filter(x=>!x.grants?.includes('access-seg-02'));const v=validateMission(m);assert.equal(v.ok,false);assert.ok(v.errors.some(e=>e.includes('Unreachable segment')))
});
test('removing the only required door clearance marks primary objective unreachable',()=>{
 const m=generateMission(cfg('office',44,{floors:1,loops:0,locks:2}));const final=m.objectives.find(x=>x.mandatory);const s=m.segments[0];
 const restricted=s.doors.find(d=>d.requires.length);assert.ok(restricted);
 final.roomId=restricted.roomId;final.position=s.rooms.find(r=>r.id===restricted.roomId).center;
 restricted.requires=['missing-clearance'];const v=validateMission(m);assert.equal(v.ok,false);assert.ok(v.errors.some(e=>e.includes('Unreachable mandatory objective')))
});
test('importing city object blueprint registers geometry dimensions and metadata without executing JS',()=>{
 const bp={schemaVersion:'b.city-object.v1',identity:{familyId:'office_test_tool',familyLabel:'Special Desk'},dimensions:{widthMeters:2.2,depthMeters:.8,heightMeters:1.0},materials:{primaryColor:'#123456'},placement:{attachmentProfile:'ground_standing'}};
 const catalog=registryFromBlueprints([bp]);assert.equal(catalog.length,BUILTIN_ASSETS.length+1);const asset=catalog.find(a=>a.id==='office_test_tool');assert.equal(asset.source,'b.city-object.v1');assert.equal(asset.width,2.2);
});
test('redecorating does not alter room boundaries, connectivity, and manually authored furniture',()=>{
 const m=generateMission(cfg('office'));const r=m.segments[0].rooms[0];r.manual=true;r.props=[{id:'hand-authored',familyId:'desk',position:{...r.center},rotation:0,scale:1}];const topology=JSON.stringify(m.segments.map(s=>({rooms:s.rooms.map(r=>r.bounds),doors:s.doors,tunnels:s.tunnels})));m.settings.decorSeed++;decorateMission(m);assert.equal(JSON.stringify(m.segments.map(s=>({rooms:s.rooms.map(r=>r.bounds),doors:s.doors,tunnels:s.tunnels}))),topology);assert.equal(r.props.length,1);assert.equal(r.props[0].id,'hand-authored');
});
test('all room props fit inside their assigned rectangular room footprints',()=>{
 for(const a of ['office','laboratory','precinct','hospital'])for(const seed of [7,818]){
  const m=generateMission(cfg(a,seed)),r=m.segments.flatMap(s=>s.rooms).filter(r=>r.shape==='rect');for(const room of r)for(const p of room.props){assert.ok(Math.abs(p.position.x-room.bounds.x)<=room.bounds.w/2+.001,`x out of room ${room.id}`);assert.ok(Math.abs(p.position.z-room.bounds.z)<=room.bounds.d/2+.001,`z out of room ${room.id}`)}
 }
});
test('movement from a room to corridor requires an explicitly opened door',()=>{
 const s=generateMission(cfg('office',15,{floors:1,openness:0})).segments[0];const d=s.doors.find(d=>d.state==='closed'&&d.side==='south');assert.ok(d);const a={x:d.position.x,z:d.position.z-.08},b={x:d.position.x,z:d.position.z+.08};assert.equal(canMove(s,a,b,new Set()),false);assert.equal(canMove(s,a,b,new Set([d.id])),true)
});
test('cave uses irregular polygon chambers and connected tunnels',()=>{
 const m=generateMission(cfg('cave',887,{floors:2}));for(const s of m.segments){assert.ok(s.rooms.every(r=>r.shape==='cavern'));assert.ok(s.rooms.every(r=>r.polygon.length>=12));assert.ok(s.tunnels.length>=s.rooms.length-1);assert.ok(areaAt(s,s.rooms[0].center));}
});
test('validator flags broken transition anchor reference',()=>{
 const m=generateMission(cfg('office'));m.transitions[0].toSegmentId='not-a-segment';assert.equal(validateMission(m).ok,false)
});
test('high branching creates actual cross-wing corridor loops',()=>{
 const m=generateMission(cfg('office',333,{rooms:45,branches:3,loops:1,floors:2}));assert.ok(m.segments.every(s=>s.corridors.some(c=>c.kind==='loop')));assert.equal(m.validation.ok,true);
});
test('navigation graph contains every endpoint and encounters are in existing rooms',()=>{
 for(const a of Object.keys(ARCHETYPES)){const m=generateMission(cfg(a,702,{floors:4,encounterDensity:85}));const ids=new Set(m.navigation.nodes.map(n=>n.id));assert.ok(m.navigation.edges.length>0);for(const e of m.navigation.edges){assert.ok(ids.has(e.from),e.id+' from missing');assert.ok(ids.has(e.to),e.id+' to missing')}const rooms=new Set(m.segments.flatMap(s=>s.rooms.map(r=>r.id)));for(const encounter of m.encounters)assert.ok(rooms.has(encounter.roomId));}
});
test('same-segment teleports preserve logical segment identity',()=>{
 const m=generateMission(cfg('laboratory',234,{floors:2,loops:3,teleports:true}));const links=m.transitions.filter(t=>t.fromSegmentId===t.toSegmentId);assert.equal(links.length,4);for(const t of links)assert.notDeepEqual(t.fromAnchor,t.toAnchor);assert.equal(m.validation.ok,true);
});
test('invalid navigation references are rejected',()=>{
 const m=generateMission(cfg('office'));m.navigation.edges[0].to='invalid-room';const v=validateMission(m);assert.equal(v.ok,false);assert.ok(v.errors.some(x=>x.includes('Broken navigation edge')))
});
