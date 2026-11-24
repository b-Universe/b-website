import { CAVE_STYLES, sampleTerrain } from './cave-terrain.js';
import { wallPieces } from './architecture.js';
import { caveBoundary,tunnelPolygon } from './cave-geometry.js';
/**
 * Canvas 2.5D fallback for browsers unable to fetch the Three.js module CDN.
 * Shares the studio interface; retains interaction picking, previews and JSON exports.
 * Does not claim GLB export or WebGL parity.
 */
const hex=(c)=>/^#[a-f0-9]{6}$/i.test(String(c))?c:'#708e9d';
const blend=(a,b,t=.2)=>{const n=parseInt(hex(a).slice(1),16),m=parseInt(hex(b).slice(1),16);const ch=(s)=>Math.round((((n>>s)&255)*(1-t))+(((m>>s)&255)*t));return `rgb(${ch(16)},${ch(8)},${ch(0)})`};
const pal={warehouse:['#737c82','#a8a6a0','#444a51'],office:['#6b889b','#b1c2c9','#203a4c'],laboratory:['#648a90','#b8d2ca','#244e5a'],precinct:['#757f8b','#c6c3b2','#3b4b5c'],hospital:['#84a9b5','#d8e7e2','#386274'],cave:['#746e64','#9b8a78','#414b48']};
function bounds(s){const pts=[];for(const r of s.rooms)if(r.bounds)pts.push({x:r.bounds.x-r.bounds.w/2,z:r.bounds.z-r.bounds.d/2},{x:r.bounds.x+r.bounds.w/2,z:r.bounds.z+r.bounds.d/2});else pts.push(...r.polygon);for(const c of s.corridors)pts.push({x:c.bounds.x-c.bounds.w/2,z:c.bounds.z-c.bounds.d/2},{x:c.bounds.x+c.bounds.w/2,z:c.bounds.z+c.bounds.d/2});return {minX:Math.min(...pts.map(p=>p.x)),maxX:Math.max(...pts.map(p=>p.x)),minZ:Math.min(...pts.map(p=>p.z)),maxZ:Math.max(...pts.map(p=>p.z))}}
const rectPoly=b=>[{x:b.x-b.w/2,z:b.z-b.d/2},{x:b.x+b.w/2,z:b.z-b.d/2},{x:b.x+b.w/2,z:b.z+b.d/2},{x:b.x-b.w/2,z:b.z+b.d/2}];
function segmentLine(ctx,pts,fill,stroke=null,weight=1){if(!pts.length)return;ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=weight;ctx.stroke()}}
export class MissionViewport{
 constructor(canvas,{onPick}={}){
  this.backend='canvas';this.canvas=canvas;this.ctx=canvas.getContext('2d');this.onPick=onPick;this.yaw=.7;this.pitch=.54;this.zoom=1;this.cx=0;this.cz=0;this.scale=4;this.segment=null;this.mission=null;this.selectedId=null;this.catalog=[];this.openIds=new Set();this.showProps=true;this.showGizmos=true;this.showCeilings=false;this.avatarPos=null;this.avatarVisible=false;this.showGrid=true;this.hitBoxes=[];
  this.ro=new ResizeObserver(()=>this.resize());this.ro.observe(canvas.parentElement);this.resize();
  let dragging=null;canvas.addEventListener('pointerdown',e=>{dragging={x:e.clientX,y:e.clientY,originX:e.clientX,originY:e.clientY};canvas.setPointerCapture?.(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-dragging.x,dy=e.clientY-dragging.y;dragging.x=e.clientX;dragging.y=e.clientY;if(Math.hypot(e.clientX-dragging.originX,e.clientY-dragging.originY)>4){this.yaw+=dx*.008;this.pitch=Math.max(.23,Math.min(.93,this.pitch+dy*.005));this.draw()}});
  canvas.addEventListener('pointerup',e=>{if(!dragging)return;const motion=Math.hypot(e.clientX-dragging.originX,e.clientY-dragging.originY);dragging=null;if(motion>5)return;const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
   const hits=this.hitBoxes.filter(h=>Math.hypot(h.x-x,h.y-y)<h.radius).sort((a,b)=>a.priority-b.priority||Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));if(hits.length)this.onPick?.(hits[0].pick);
  });
  canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.24,Math.min(4.8,this.zoom*(e.deltaY>0?.87:1.14)));this.draw()},{passive:false});
 }
 resize(){const r=this.canvas.parentElement.getBoundingClientRect();const d=Math.min(window.devicePixelRatio||1,2);if(this.W&&this.H&&r.width&&r.height)this.scale*=Math.min(r.width/this.W,r.height/this.H);this.canvas.width=Math.max(2,Math.floor(r.width*d));this.canvas.height=Math.max(2,Math.floor(r.height*d));this.ctx.setTransform(d,0,0,d,0,0);this.W=r.width;this.H=r.height;this.draw()}
 project(x,z,y=0){const a=x-this.cx,b=z-this.cz,c=Math.cos(this.yaw),s=Math.sin(this.yaw),u=a*c-b*s,v=a*s+b*c;return {x:this.W*.50+u*this.scale*this.zoom,y:this.H*.54+v*this.scale*this.zoom*this.pitch-y*this.scale*this.zoom*.75}}
 setMission(mission,segmentId,catalog=[],{refocus=false}={}){const seg=mission.segments.find(s=>s.id===segmentId)||mission.segments[0];const changed=seg.id!==this.segment?.id;if(changed||seg!==this.segment)this.walls=seg.architecture?seg.architecture.partitions.flatMap(wallPieces):seg.archetype==='cave'&&!seg.terrain?caveBoundary(seg):null;this.segment=seg;this.mission=mission;this.catalog=catalog;if(refocus||changed)this.fit();else this.draw()}
 fit(){if(this.segment)this.frameBounds(this.segment.terrain?this.segment.bounds:bounds(this.segment))}
 frameBounds(b){
  this.cx=(b.minX+b.maxX)/2;this.cz=(b.minZ+b.maxZ)/2;
  const w=b.maxX-b.minX,d=b.maxZ-b.minZ,c=Math.abs(Math.cos(this.yaw)),s=Math.abs(Math.sin(this.yaw));
  this.scale=Math.min((this.W||800)*.86/(c*w+s*d+4),(this.H||450)*.75/(this.pitch*(s*w+c*d)+this.segment.architecturalHeight*.75+4));
  this.zoom=1;this.draw();
 }
 focusRoom(id){
  const room=this.segment?.rooms.find(room=>room.id===id);
  if(room)this.frameBounds(bounds({rooms:[room],corridors:[]}));
 }
 topView(){this.yaw=0;this.pitch=.98;this.fit()}
 isometricView(){this.yaw=Math.PI/4;this.pitch=.58;this.draw()}
 highlight(id){this.selectedId=id;this.draw()}
 setAvatar(pos,enabled){this.avatarPos=pos;this.avatarVisible=enabled;this.draw()}
 walkCamera(pos){this.cx=pos.x;this.cz=pos.z;this.zoom=Math.max(this.zoom,2.7);this.draw()}
 follow(pos){/* player remains visible; full scene is deliberately retained for this fallback */}
 setDoorStates(ids){this.openIds=ids;this.draw()}
 toggleGrid(v){this.showGrid=v;this.draw()}
 draw(){const ctx=this.ctx;if(!ctx||!this.W||!this.segment)return;const W=this.W,H=this.H,s=this.segment,palette=pal[this.mission.archetype]||pal.office,proj=(p,y=0)=>this.project(p.x,p.z,(p.y??sampleTerrain(s.terrain,p)?.y??0)+y);ctx.clearRect(0,0,W,H);
  const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#152a3d');grad.addColorStop(1,'#0b1723');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
  if(this.showGrid){for(let x=-220;x<=440;x+=12){const a=proj({x,z:-220}),b=proj({x,z:220});ctx.strokeStyle='#29485a44';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
   for(let z=-220;z<=220;z+=12){const a=proj({x:-220,z}),b=proj({x:440,z});ctx.strokeStyle='#29485a44';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}}
  this.hitBoxes=[];const surfaces=[];
  const add=(poly,color,pick,priority=5)=>{const pts=poly.map(p=>proj(p));surfaces.push({pts,depth:pts.reduce((n,p)=>n+p.y,0)/pts.length,color,pick,priority,poly})};
  if(s.terrain){
   this.drawTerrain(ctx,s.terrain);
   for(const room of s.rooms){
    const center=proj(room.center);
    if(room.id===this.selectedId){
     ctx.beginPath();ctx.arc(center.x,center.y,7,0,2*Math.PI);ctx.strokeStyle='#5ef8e4';ctx.stroke();
    }
    this.hitBoxes.push({...center,radius:Math.max(8,Math.min(45,(room.radius||10)*this.scale*this.zoom)),priority:3,pick:{type:'room',id:room.id}});
   }
  }else{
  for(const c of s.corridors)add(rectPoly(c.bounds),palette[2],{type:'corridor',id:c.id},4);
  for(const t of s.tunnels)add(tunnelPolygon(t),palette[2],{type:'tunnel',id:t.id},4);
  for(const r of s.rooms)add(r.polygon||rectPoly(r.bounds),r.phase==='landmark'?'#518c95':r.id===this.selectedId?'#328b8d':palette[0],{type:'room',id:r.id},3);
  surfaces.sort((a,b)=>a.depth-b.depth);
  for(const a of surfaces){segmentLine(ctx,a.pts,a.color,a.pick.type==='room'&&a.pick.id===this.selectedId?'#5ef8e4':this.walls?null:'#6c9eac',a.pick.id===this.selectedId?2:1);const center=a.pts.reduce((p,q)=>({x:p.x+q.x/a.pts.length,y:p.y+q.y/a.pts.length}),{x:0,y:0});this.hitBoxes.push({...center,radius:Math.max(7,Math.min(36,Math.abs(this.scale*this.zoom)*3.4)),priority:a.priority,pick:a.pick})}
  // Low-poly wall slabs; made translucent to reveal the entire room floor.
  if(this.showWalls!==false){
   const spans=this.walls||s.rooms.flatMap(r=>{const poly=r.polygon||rectPoly(r.bounds);return poly.map((p,i)=>[p,poly[(i+1)%poly.length]])});
   const walls=spans.map(([a,b])=>{
    const p1=proj(a),p2=proj(b),height=this.pitch<.93?s.architecturalHeight*.67:.04;
    return {pts:[p1,p2,proj(b,height),proj(a,height)],depth:(p1.y+p2.y)/2};
   });
   walls.sort((a,b)=>a.depth-b.depth);
   for(const wall of walls)segmentLine(ctx,wall.pts,'rgba(151,190,197,0.12)','rgba(174,223,219,.42)',.8);
  }
  }
  const assetReg=new Map(this.catalog.map(a=>[a.id,a]));
  if(this.showProps)for(const room of s.rooms){for(const obj of room.props){const item=assetReg.get(obj.familyId),x=obj.position.x,z=obj.position.z,h=Math.max(.45,Math.min(2,item?.height||1));const a=proj({x,z},h*.35);const size=Math.max(1,Math.min(7,(item?.width||1)*this.scale*this.zoom*.2));ctx.fillStyle=hex(item?.color);ctx.strokeStyle='#182a36';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(a.x,a.y-size*1.4);ctx.lineTo(a.x+size,a.y);ctx.lineTo(a.x,a.y+size*.65);ctx.lineTo(a.x-size,a.y);ctx.closePath();ctx.fill();ctx.stroke()}}
  for(const d of s.doors.filter(d=>d.state!=='open'||d.requires.length)){const p=proj(d.position,.22);ctx.fillStyle=this.openIds.has(d.id)?'#4fe6ca':d.requires.length?'#ffad79':'#73dbe0';ctx.fillRect(p.x-2.5,p.y-2.5,5,5);this.hitBoxes.push({...p,radius:10,priority:1,pick:{type:'door',id:d.id}})}
  if(this.showGizmos){const marker=(pos,label,color,pick,priority=0)=>{const p=proj(pos,.85);ctx.beginPath();ctx.arc(p.x,p.y,6.5,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='#0d2532';ctx.stroke();ctx.fillStyle='#073342';ctx.font='700 10px sans-serif';ctx.textAlign='center';ctx.fillText(label,p.x,p.y+3.5);this.hitBoxes.push({...p,radius:14,priority,pick})};
   for(const i of s.interactables)marker(i.position,'!', '#f2d587',{type:'interaction',id:i.id});
   for(const t of this.mission.transitions.filter(t=>t.fromSegmentId===s.id))marker(t.fromAnchor,t.kind==='portal'?'◎':'↑',t.kind==='portal'?'#d1a3ef':'#66dfff',{type:'transition',id:t.id});
   for(const o of this.mission.objectives.filter(o=>o.segmentId===s.id))marker(o.position,'★','#87efae',{type:'objective',id:o.id});
   marker(s.anchors.entry,'E','#79acfa',{type:'anchor',id:'entry'},2);
  }
  if(this.avatarVisible&&this.avatarPos){const p=proj(this.avatarPos,.8);ctx.beginPath();ctx.arc(p.x,p.y,8,0,Math.PI*2);ctx.fillStyle='#fafbf5';ctx.fill();ctx.strokeStyle='#23dcd7';ctx.lineWidth=3;ctx.stroke()}
  ctx.font='10px system-ui';ctx.fillStyle='#85a4b1';ctx.textAlign='left';ctx.fillText('CANVAS PREVIEW  ·  WEBGL CDN UNAVAILABLE',16,H-12)
 }
 drawTerrain(ctx,terrain){
  const cacheKey=[this.cx,this.cz,this.yaw,this.pitch,this.zoom,this.scale,this.canvas.width,this.canvas.height,this.showWalls,this.showCeilings,this.showWireframe,this.showGrade].join('|');
  if(this.terrainRender?.terrain===terrain&&this.terrainRender.key===cacheKey){
   ctx.drawImage(this.terrainRender.canvas,0,0,this.W,this.H);return;
  }
  const target=ctx,canvas=document.createElement('canvas');
  canvas.width=this.canvas.width;canvas.height=this.canvas.height;
  ctx=canvas.getContext('2d');
  ctx.setTransform(canvas.width/this.W,0,0,canvas.height/this.H,0,0);
  const style=CAVE_STYLES[terrain.style]||CAVE_STYLES.limestone;
  const grades=new Set(this.showGrade?terrain.navigation.steepTriangles||[]:[]);
  const drawLayer=(surface,color,alpha)=>{
   const {vertices,indices}=surface,projected=[],triangles=[];
   for(let i=0;i<vertices.length;i+=3)projected.push(this.project(vertices[i],vertices[i+2],vertices[i+1]));
   const palette=Array.from({length:9},(_,i)=>blend(color,'#252633',i*.062));
   for(let i=0;i<indices.length;i+=3){
    const ids=[indices[i],indices[i+1],indices[i+2]],points=ids.map(id=>projected[id]);
    if(points.every(point=>point.x<0)||points.every(point=>point.x>this.W)||
      points.every(point=>point.y<0)||points.every(point=>point.y>this.H))continue;
    const [a,b,c]=ids.map(id=>id*3);
    const slope=(vertices[b+1]-vertices[a+1])-(vertices[c+1]-vertices[a+1]);
    const tint=Math.max(0,Math.min(8,Math.round(4+slope*2+Math.sin(vertices[a]*.43+vertices[a+2]*.16)*2)));
    triangles.push({points,tint,steep:surface===terrain.floor&&grades.has(i/3),z:points.reduce((n,p)=>n+p.y,0)});
   }
   triangles.sort((a,b)=>a.z-b.z);
   ctx.globalAlpha=alpha;
   for(const triangle of triangles)segmentLine(ctx,triangle.points,triangle.steep?'#bc754d':palette[triangle.tint],this.showWireframe?'#82b4ac':null,.55);
   ctx.globalAlpha=1;
  };
  drawLayer(terrain.floor,style.floor,1);
  if(terrain.water?.indices.length)drawLayer(terrain.water,'#448caa',.65);
  if(this.showWalls!==false)drawLayer(terrain.walls,style.rock,.6);
  if(this.showCeilings)drawLayer(terrain.ceiling,style.roof,.57);
  for(const feature of terrain.formations){
   const p=this.project(feature.position.x,feature.position.z,feature.position.y);
   const h=feature.height*this.scale*this.zoom*.75,w=feature.radius*this.scale*this.zoom;
   const tip=feature.kind==='stalactite'?p.y+h:p.y-h;
   segmentLine(ctx,[{x:p.x-w,y:p.y},{x:p.x+w,y:p.y},{x:p.x+w*.23,y:tip}],feature.kind==='crystal'?'#65c8d4':style.rock);
  }
  this.terrainRender={terrain,key:cacheKey,canvas};
  target.drawImage(canvas,0,0,this.W,this.H);
 }
 snapshot(){const a=document.createElement('a');a.download=`b-mission-${this.segment?.id||'preview'}.png`;a.href=this.canvas.toDataURL('image/png');a.click()}
 async exportVisibleGLB(){throw new Error('GLB export requires Three.js. Restore connectivity and reload.')}
 destroy(){this.ro.disconnect()}
}
