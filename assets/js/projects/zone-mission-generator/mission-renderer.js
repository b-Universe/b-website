/** Three.js rendering and preview interaction for B Zone Mission Studio.
 * Import map in index.html pins Three.js 0.160.1; Live Server is sufficient.
 */
import { caveBoundary } from './cave-geometry.js';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {CAVE_STYLES, sampleTerrain} from './cave-terrain.js';
import {BUILTIN_ASSETS,areaAt} from './mission-core.js';
const L=(hex)=>new THREE.Color(hex);
const MATERIALS={
 warehouse:{wall:'#81898c',floor:'#66676e',trim:'#464d52',accent:'#f6b45e',exterior:'#4a5154'},
 office:{wall:'#a5b5be',floor:'#617789',trim:'#2e5366',accent:'#25c9c5',exterior:'#445e6e'},
 laboratory:{wall:'#b2c9c8',floor:'#607f8a',trim:'#527479',accent:'#37e3d2',exterior:'#4d6169'},
 precinct:{wall:'#b9b5a8',floor:'#77818a',trim:'#526276',accent:'#e4ba61',exterior:'#566575'},
 hospital:{wall:'#c4d7d5',floor:'#829ea8',trim:'#698d9e',accent:'#83dad8',exterior:'#678893'},
 cave:{wall:'#6e665f',floor:'#696057',trim:'#3c3c42',accent:'#9cbdc3',exterior:'#47494b'}
};
const material=(color,params={})=>new THREE.MeshStandardMaterial({color,roughness:.82,metalness:.02,...params});
const box=(parent,x,y,z,w,h,d,mat,meta)=>{
 const g=new THREE.BoxGeometry(Math.max(.02,w),Math.max(.02,h),Math.max(.02,d));
 const m=new THREE.Mesh(g,mat);m.position.set(x,y,z);m.receiveShadow=false;m.castShadow=false;if(meta)m.userData.pick=meta;parent.add(m);return m;
};
const cylinder=(parent,x,y,z,r1,r2,h,mat,n=9)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,n),mat);o.position.set(x,y,z);parent.add(o);return o};
const cone=(parent,x,y,z,r,h,mat,n=7)=>{const o=new THREE.Mesh(new THREE.ConeGeometry(r,h,n),mat);o.position.set(x,y,z);parent.add(o);return o};
const wall=(group,x,z,dx,dz,height,mat)=>box(group,x,height/2,z,dx>0?dx:.20,height,dz>0?dz:.20,mat);
const localPalette=(archetype,condition,theme)=>{
 const v={...MATERIALS[archetype]};
 if(condition==='abandoned'||condition==='damaged'){const fade=condition==='damaged'?.38:.24;for(const k of ['wall','floor','trim']){const a=L(v[k]);a.lerp(L('#594e49'),fade);v[k]='#'+a.getHexString()}}
 if(condition==='lockdown')v.accent='#f08d6a';
 if(theme==='futuristic'){v.accent='#53e7ff';v.trim='#365b70'}
 if(theme==='retro'){v.trim='#776952';v.floor='#807569'}
 if(theme==='industrial'){v.floor='#657172';v.trim='#575d62'}
 return v;
};
function outlineRect(g,b,color,y=.09){const pts=[[-b.w/2,-b.d/2],[b.w/2,-b.d/2],[b.w/2,b.d/2],[-b.w/2,b.d/2],[-b.w/2,-b.d/2]].map(([x,z])=>new THREE.Vector3(b.x+x,y,b.z+z));const ob=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color,transparent:true,opacity:.70}));g.add(ob);return ob}
function line3(parent,a,b,color,opacity=.7,y=.22){const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a.x,y,a.z),new THREE.Vector3(b.x,y,b.z)]);const m=new THREE.Line(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity}));parent.add(m);return m}
function putWallSpan(g,a,b,door,H,mat){
 // Single wall segment with optional rectangular, usable door opening.
 const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<.05)return;
 const horizontal=Math.abs(dx)>Math.abs(dz),mid=(horizontal?(a.x+b.x)/2:(a.z+b.z)/2);
 const center=door?(horizontal?door.position.x:door.position.z):null;
 const opening=door?door.width:0;
 const loc=(center===null)?0:Math.max(-len/2+.3,Math.min(len/2-.3,center-mid));
 const start=loc-opening/2,end=loc+opening/2;
 const draw=(u,v,height=H,y0=0)=>{
  const length=v-u;if(length<.06||height<.01)return;
  if(horizontal)box(g,mid+(u+v)/2,y0+height/2,a.z,length,height,.19,mat);
  else box(g,a.x,y0+height/2,mid+(u+v)/2,.19,height,length,mat);
 };
 if(door){draw(-len/2,Math.max(-len/2,start));draw(Math.min(len/2,end),len/2);draw(Math.max(-len/2,start),Math.min(len/2,end),Math.max(0,H-door.height),door.height)}
 else draw(-len/2,len/2);
}
function propProxy(group,p,asset,getMaterial){
 const c=asset?.color||'#73929d',w=Math.min(asset?.width||1,4.8),d=Math.min(asset?.depth||1,4),h=Math.min(asset?.height||1,4);
 const materialMain=getMaterial(c),dark=getMaterial('#34414b'),shine=getMaterial('#8ccad1',{metalness:.3}),wood=getMaterial('#917354');
 const g=new THREE.Group();g.position.set(p.position.x,0,p.position.z);g.rotation.y=p.rotation||0;g.scale.setScalar(p.scale||1);group.add(g);
 const type=p.familyId;
 if(['desk','reception_desk','lab_bench'].includes(type)){
  box(g,0,.68,0,w,.14,d,materialMain);for(const sx of [-1,1])for(const sz of [-1,1])box(g,sx*(w/2-.12),.34,sz*(d/2-.10),.10,.68,.10,dark);
  if(type==='lab_bench')box(g,0,1.02,-d*.33,w*.56,.38,.12,shine);
 }else if(type==='office_chair'||type==='bench'||type==='sofa'){
  box(g,0,.46,0,w,.21,d,materialMain);box(g,0,.70,-d*.39,w,.65,.16,materialMain);if(type==='office_chair')cylinder(g,0,.22,0,.13,.15,.45,dark,8);
 }else if(type==='computer'||type==='medical_monitor'){
  box(g,0,.58,0,.10,.5,.10,dark);box(g,0,.92,0,w,.45,.09,dark);box(g,0,.92,d*.16,w*.84,.32,.03,shine);
 }else if(['printer','file_cabinet','cabinet','server_rack','console','generator'].includes(type)){
  box(g,0,h/2,0,w,h,d,materialMain);for(let j=0;j<3;j++)box(g,0,h*(.18+j*.27),d/2+.014,w*.75,.055,.024,dark);
 }else if(type==='plant'){
  cylinder(g,0,.21,0,.32,.24,.42,wood);for(let j=0;j<3;j++)cone(g,(j-1)*.17,.62+j*.22,(j%2?-.15:.12),.46,.67,getMaterial('#588969'),7);
 }else if(type==='hospital_bed'){
  box(g,0,.48,0,w,.19,d,getMaterial('#cbd3d8'));box(g,0,.68,-d*.39,w*.88,.18,d*.22,getMaterial('#ebeff0'));box(g,0,.42,d*.48,w,.40,.10,materialMain);
 }else if(['tank','hazard_barrel','water_cooler'].includes(type)){
  cylinder(g,0,h/2,0,Math.min(w,d)*.5,Math.min(w,d)*.5,h,materialMain,12);cylinder(g,0,h*.82,0,w*.52,w*.52,.08,shine,12);
 }else if(type==='medical_cart'){
  for(let y=.32;y<1.1;y+=.28)box(g,0,y,0,w,.07,d,materialMain);for(const sx of [-1,1])for(const sz of [-1,1])box(g,sx*w*.43,.46,sz*d*.4,.08,.92,.08,dark);
 }else if(type==='boulder'){
  const geo=new THREE.DodecahedronGeometry(Math.max(.5,w*.65),0),mesh=new THREE.Mesh(geo,materialMain);mesh.scale.set(1,h/Math.max(1,w),.85);mesh.position.y=h*.38;g.add(mesh);
 }else if(type==='crystal'||type==='stalagmite'){
  for(let j=0;j<3;j++)cone(g,(j-1)*.34,h*(.36+j*.07),(j%2)*.2,w*.33,h*(.72-j*.13),materialMain,5);
 }else if(type==='support_beam'){
  box(g,0,h*.95,0,w,.17,.3,wood);for(const sx of [-1,1])box(g,sx*w*.45,h*.47,0,.24,h*.9,.24,wood);
 }else if(type==='lantern'){
  cylinder(g,0,.30,0,.20,.2,.55,dark,6);cylinder(g,0,.37,0,.16,.16,.36,getMaterial('#ffbf60',{emissive:'#e6953f',emissiveIntensity:.55}),6);
 }else{
  box(g,0,h/2,0,w,h,d,materialMain);
 }
 return g;
}

function batchStaticGeometry(world){
 const batches=new Map();
 world.updateMatrixWorld(true);
 world.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.visible||mesh.material.transparent||mesh.userData.caveSurface)return;
  if(mesh.userData.pick&&mesh.userData.pick.type!=='prop')return;
  const key=`${mesh.material.id}:${Boolean(mesh.geometry.index)}`;
  if(!batches.has(key))batches.set(key,[]);
  batches.get(key).push(mesh);
 });
 for(const meshes of batches.values()){
  if(meshes.length<4)continue;
  const geometries=meshes.map(mesh=>mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));
  const merged=mergeGeometries(geometries);
  geometries.forEach(geometry=>geometry.dispose());
  if(!merged)continue;
  for(const mesh of meshes){
   mesh.userData.batched=true;
   mesh.visible=false;
  }
  world.add(new THREE.Mesh(merged,meshes[0].material));
 }
}

function caveMeshGeometry(surface,color){
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(surface.vertices,3));
 geometry.setIndex(surface.indices);
 const base=new THREE.Color(color),colors=[];
 for(let i=0;i<surface.vertices.length;i+=3){
  const [x,y,z]=surface.vertices.slice(i,i+3);
  const factor=.77+.16*Math.sin(x*.061+y*.23-z*.052)+.09*Math.cos(z*.31-y*.18+x*.18);
  colors.push(base.r*factor,base.g*factor,base.b*factor);
 }
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.computeVertexNormals();
 return geometry;
}

function formationGeometry(feature){
 const {radius,height,phase,kind}=feature;
 const down=kind==='stalactite'?-1:1,sides=7;
 const radii=kind==='pillar'?[1,.66,.79,.9]:kind==='boulder'?[.82,1,.64,.14]:[1,.71,.36,.035];
 const vertices=[],indices=[];
 for(let ring=0;ring<radii.length;ring++)for(let i=0;i<sides;i++){
  const t=phase+2*Math.PI*i/sides+ring*.21;
  const r=radius*radii[ring]*(.85+.15*Math.cos(i*3.4+phase+ring));
  vertices.push(Math.cos(t)*r+radius*.17*Math.sin(ring+phase),down*height*ring/3,Math.sin(t)*r);
 }
 for(let ring=0;ring<3;ring++)for(let i=0;i<sides;i++){
  const a=ring*sides+i,b=ring*sides+(i+1)%sides,c=a+sides,d=b+sides;
  indices.push(a,b,c,b,d,c);
 }
 for(let i=1;i<sides-1;i++)indices.push(0,i+1,i,3*sides,3*sides+i,3*sides+i+1);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 return geometry;
}

export class MissionViewport{
 constructor(canvas,{onPick}={}){
  this.canvas=canvas;this.onPick=onPick;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
  this.renderer.setPixelRatio(Math.min(1.7,window.devicePixelRatio||1));this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.scene=new THREE.Scene();this.scene.background=L('#101c2b');this.scene.fog=new THREE.Fog('#101c2b',90,340);
  this.camera=new THREE.PerspectiveCamera(44,1,.1,900);this.camera.position.set(34,39,39);
  this.controls=new OrbitControls(this.camera,canvas);this.controls.enableDamping=true;this.controls.dampingFactor=.09;this.controls.maxPolarAngle=Math.PI*.485;this.controls.minDistance=6;this.controls.maxDistance=310;
  this.sky=new THREE.HemisphereLight('#d9eeff','#3c4650',2.2);this.sun=new THREE.DirectionalLight('#fff3dd',2.0);this.sun.position.set(20,45,16);this.scene.add(this.sky,this.sun);
  this.world=new THREE.Group();this.scene.add(this.world);this.helperRoot=new THREE.Group();this.scene.add(this.helperRoot);
  this.grid=new THREE.GridHelper(500,100,'#2d5361','#294253');
  this.grid.material.transparent=true;this.grid.material.opacity=.55;
  this.grid.position.y=-.17;this.scene.add(this.grid);
  this.pointer=new THREE.Vector2();this.raycaster=new THREE.Raycaster();this.selectable=[];this.doorMeshes=new Map();this.mission=null;this.segment=null;this.catalog=BUILTIN_ASSETS;this.selectedId=null;this.showCeilings=false;this.showProps=true;this.showLabels=true;this.showGrid=true;this.showGizmos=true;
  this.avatar=new THREE.Group();const body=material('#2ce7d4',{emissive:'#098d86',emissiveIntensity:.35});cylinder(this.avatar,0,.88,0,.35,.38,1.55,body,10);cone(this.avatar,0,1.85,-.26,.26,.42,material('#ffffff'),5);this.avatar.visible=false;this.scene.add(this.avatar);
  this.ro=new ResizeObserver(()=>this.resize());this.ro.observe(canvas.parentElement);this.resize();
  let down=null;canvas.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY});canvas.addEventListener('pointerup',e=>{
   if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5){down=null;return;}down=null;
   const rect=canvas.getBoundingClientRect();this.pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);
   const hits=this.raycaster.intersectObjects(this.selectable,false);const picked=hits.find(hit=>hit.object.visible||hit.object.userData.batched);if(picked&&this.onPick){
    const pick=picked.object.userData.pick;
    if(pick.type==='terrain'){
     const id=areaAt(this.segment,picked.point);
     if(id)this.onPick({id,type:this.segment.rooms.some(room=>room.id===id)?'room':'tunnel'});
    }else this.onPick(pick);
   }
  });
  this.alive=true;const tick=()=>{if(!this.alive)return;requestAnimationFrame(tick);if(this.controls.update()||this.needsRender){this.renderer.render(this.scene,this.camera);this.needsRender=false}};tick();
 }
 resize(){this.needsRender=true;const b=this.canvas.parentElement.getBoundingClientRect();if(!b.width||!b.height)return;this.renderer.setSize(b.width,b.height,false);this.camera.aspect=b.width/b.height;this.camera.updateProjectionMatrix()}
 clear(){this.selectable=[];this.doorMeshes.clear();this.world.traverse(obj=>{if(obj.geometry)obj.geometry.dispose();if(obj.material){const mats=Array.isArray(obj.material)?obj.material:[obj.material];for(const m of mats)m.dispose()}});this.world.clear();this.helperRoot.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});this.helperRoot.clear()}
 setMission(mission,segmentId,catalog=BUILTIN_ASSETS,{refocus=false}={}){
  const segment=mission?.segments.find(s=>s.id===segmentId)||mission?.segments[0];if(!segment)return;
  const changed=this.segment?.id!==segment.id;this.clear();this.mission=mission;this.segment=segment;this.catalog=catalog;
  const lighting={bright:1.18,normal:1,dim:.64}[segment.environment?.lighting]||1;
  this.sky.intensity=2.2*lighting;this.sun.intensity=2*lighting;
  this.needsRender=true;
  const palette=localPalette(mission.archetype,mission.condition,mission.theme);
  const wallMat=material(palette.wall),floorMat=material(palette.floor),hallMat=material(palette.trim),trimMat=material(palette.accent),ceilingMat=material(palette.wall,{transparent:true,opacity:.20,depthWrite:false,side:THREE.DoubleSide});
  if(segment.terrain)this.renderTerrain(segment);
  else if(mission.archetype==='cave')this.renderCave(segment,wallMat,floorMat,hallMat);
  else this.renderBuilding(segment,wallMat,floorMat,hallMat,trimMat,ceilingMat);
  this.propRoot=new THREE.Group();this.world.add(this.propRoot);
  if(this.showProps){
   const registry=new Map(catalog.map(asset=>[asset.id,asset]));
   const materials=new Map();
   const getMaterial=(color,options={})=>{
    const key=JSON.stringify([color,options]);
    if(!materials.has(key))materials.set(key,material(color,options));
    return materials.get(key);
   };
   for(const room of segment.rooms)for(const prop of room.props){
    const group=propProxy(this.propRoot,prop,registry.get(prop.familyId),getMaterial);
    group.position.y=sampleTerrain(segment.terrain,prop.position)?.y||0;
    for(const child of group.children)if(child.isMesh){
     child.userData.pick={type:'prop',id:prop.id,roomId:room.id};this.selectable.push(child);
    }
   }
  }
  batchStaticGeometry(this.world);
  this.renderGizmos(segment);
  this.highlight(this.selectedId);
  if(refocus||changed)this.fit();
 }
 renderBuilding(s,wallMat,floorMat,hallMat,trimMat,ceilingMat){
  const H=s.architecturalHeight;
  if(s.architecture){
   const landmarkMat=material('#7e9fa7');
   for(const area of [...s.corridors,...s.rooms]){
    const b=area.bounds,isRoom=Boolean(area.phase),landmark=area.phase==='landmark';
    const mat=isRoom?(landmark?landmarkMat:floorMat):hallMat;
    this.selectable.push(box(this.world,b.x,-.065,b.z,b.w,.13,b.d,mat,{type:isRoom?'room':'corridor',id:area.id}));
    if(landmark)outlineRect(this.helperRoot,b,'#3fe9dc',.015);
    if(this.showCeilings)box(this.world,b.x,area.ceilingHeight||H,b.z,b.w,.18,b.d,ceilingMat);
    if(this.showWalls!==false)for(const column of area.columns||[]){
     const height=area.ceilingHeight||H;
     box(this.world,column.x,height/2,column.z,column.w,height,column.d,wallMat);
    }
   }
   const heights=new Map(s.rooms.map(room=>[room.id,room.ceilingHeight||H]));
   const doors=new Map(s.doors.map(door=>[door.id,door]));
   const lockedMat=material('#ca8861'),leafMat=material('#5ca3aa');
   for(const partition of s.architecture.partitions){
    const {a,b,opening}=partition;
    if(opening&&opening.width>=Math.hypot(b.x-a.x,b.z-a.z)-.001)continue;
    if(this.showWalls!==false)putWallSpan(this.world,a,b,opening,Math.max(H,...partition.regions.map(id=>heights.get(id)||H)),wallMat);
    const door=doors.get(opening?.doorId);
    if(!door||(door.state==='open'&&!door.requires.length))continue;
    const horizontal=a.z===b.z;
    const leaf=box(this.world,door.position.x,door.height/2,door.position.z,horizontal?door.width:.12,door.height,horizontal?.12:door.width,door.requires.length?lockedMat:leafMat,{type:'door',id:door.id});
    this.doorMeshes.set(door.id,leaf);
    this.selectable.push(leaf);
    if(door.height<H)box(this.world,door.position.x,door.height+.04,door.position.z,horizontal?door.width+.15:.28,.08,horizontal?.28:door.width+.15,trimMat);
   }
   return;
  }
  for(const corridor of s.corridors){const b=corridor.bounds;
   const mat=corridor.kind==='main'?hallMat:floorMat;
   const tile=box(this.world,b.x,-.065,b.z,b.w,.13,b.d,mat,{type:'corridor',id:corridor.id});this.selectable.push(tile);
   outlineRect(this.world,b,'#405b69',.01);
   // end caps for wing corridors and the central corridor
   if(this.showWalls!==false&&corridor.kind==='main'){
    wall(this.world,b.x-b.w/2,b.z,.18,b.d,H,wallMat);wall(this.world,b.x+b.w/2,b.z,.18,b.d,H,wallMat);
   }else if(this.showWalls!==false&&corridor.kind==='wing'){
    const endZ=b.z+(b.z<0?-b.d/2:b.d/2);
    const loops=s.corridors.some(c=>c.kind==='loop'&&Math.abs(c.bounds.z-endZ)<c.bounds.d);
    if(!loops)wall(this.world,b.x,endZ,b.w,.18,H,wallMat);
   }
  }
  for(const room of s.rooms){const b=room.bounds;if(!b)continue;
   const floor=box(this.world,b.x,-.045,b.z,b.w,.10,b.d,room.phase==='landmark'?material('#7e9fa7'):floorMat,{type:'room',id:room.id});this.selectable.push(floor);
   const x0=b.x-b.w/2,x1=b.x+b.w/2,z0=b.z-b.d/2,z1=b.z+b.d/2;
   const d=s.doors.find(x=>x.roomId===room.id);
   if(this.showWalls!==false)putWallSpan(this.world,{x:x0,z:z0},{x:x1,z:z0},room.doorSide==='north'?d:null,H,wallMat);
   if(this.showWalls!==false)putWallSpan(this.world,{x:x0,z:z1},{x:x1,z:z1},room.doorSide==='south'?d:null,H,wallMat);
   if(this.showWalls!==false)putWallSpan(this.world,{x:x0,z:z0},{x:x0,z:z1},room.doorSide==='west'?d:null,H,wallMat);
   if(this.showWalls!==false)putWallSpan(this.world,{x:x1,z:z0},{x:x1,z:z1},room.doorSide==='east'?d:null,H,wallMat);
   box(this.world,b.x,H-.15,b.z,b.w,.24,b.d,ceilingMat).visible=this.showCeilings;
   if(d){const horizontal=d.side==='north'||d.side==='south';const m=box(this.world,d.position.x,1.17,d.position.z,horizontal?d.width:.12,2.35,horizontal?.12:d.width,d.requires.length?material('#ca8861'):material('#5ca3aa'),{type:'door',id:d.id});this.doorMeshes.set(d.id,m);this.selectable.push(m);
    box(this.world,d.position.x,2.48,d.position.z,horizontal?d.width+.2:.3,.10,horizontal?.3:d.width+.2,trimMat);
   }
   if(room.phase==='landmark'){outlineRect(this.helperRoot,b,'#3fe9dc',.18)}
  }
  // Corridor perimeter walls only where no doorway/wing exists (avoid covering playable entrances).
  const main=s.corridors.find(x=>x.kind==='main')?.bounds;
  if(main&&this.showWalls!==false){for(const sign of [-1,1]){
   const z=sign*main.d/2;const len=main.w,parts=Math.round(len/7.4)+2;
   for(let i=0;i<parts;i++){
    const x=main.x-main.w/2+(i+.5)*main.w/parts,dx=main.w/parts;
    const byRoom=s.rooms.some(r=>r.doorSide===(sign>0?'north':'south')&&Math.abs(r.bounds.x-x)<dx*.56);
    const byWing=s.corridors.some(c=>c.kind==='wing'&&Math.abs(c.bounds.x-x)<c.bounds.w);
    if(!byRoom&&!byWing)wall(this.world,x,z,dx,.18,H,wallMat);
   }
  }}
 }
 renderTerrain(segment){
  const terrain=segment.terrain,style=CAVE_STYLES[terrain.style]||CAVE_STYLES.limestone;
  const layers=[['floor',style.floor,true],['walls',style.rock,this.showWalls!==false],['ceiling',style.roof,this.showCeilings]];
  for(const [name,color,visible] of layers){
   const geometry=caveMeshGeometry(terrain[name],color);
   const mat=material('#ffffff',{vertexColors:true,flatShading:true,side:THREE.DoubleSide});
   const mesh=new THREE.Mesh(geometry,mat);
   mesh.name='Cave '+name;
   mesh.userData.caveSurface=true;
   mesh.visible=visible;
   this.world.add(mesh);
   if(name==='floor'){mesh.userData.pick={type:'terrain'};this.selectable.push(mesh);}
   if(name==='floor'&&this.showGrade&&terrain.navigation.steepTriangles?.length){
    const steep=new THREE.BufferGeometry();
    steep.setAttribute('position',geometry.getAttribute('position'));
    steep.setIndex(terrain.navigation.steepTriangles.flatMap(index=>terrain.floor.indices.slice(index*3,index*3+3)));
    const marker=new THREE.Mesh(steep,new THREE.MeshBasicMaterial({color:'#e18752',transparent:true,opacity:.67,
      polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-3,side:THREE.DoubleSide}));
    this.helperRoot.add(marker);
   }
   if(this.showWireframe&&visible){
    const wire=new THREE.LineSegments(new THREE.WireframeGeometry(geometry),new THREE.LineBasicMaterial({color:'#9cf7e9',transparent:true,opacity:.58,depthTest:true}));
    wire.position.y=.035;this.helperRoot.add(wire);
   }
  }
  if(terrain.water?.indices.length){
   const water=new THREE.Mesh(caveMeshGeometry(terrain.water,'#448caa'),material('#4386a6',{transparent:true,opacity:.60,roughness:.31,side:THREE.DoubleSide,depthWrite:false}));
   water.name='Shallow cave pools';
   this.world.add(water);
  }
  const rockMaterials=new Map();
  for(const feature of terrain.formations){
   const color=feature.kind==='crystal'?'#65c8d4':style.rock;
   if(!rockMaterials.has(color))rockMaterials.set(color,material(color,{flatShading:true,side:THREE.DoubleSide}));
   const mesh=new THREE.Mesh(formationGeometry(feature),rockMaterials.get(color));
   mesh.name=feature.kind;
   mesh.position.set(feature.position.x,feature.position.y,feature.position.z);
   this.world.add(mesh);
  }
 }
 renderCave(s,wallMat,floorMat,hallMat){
  for(const t of s.tunnels){const a=t.fromPosition,b=t.toPosition;
   const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),angle=-Math.atan2(dz,dx);
   const floor=box(this.world,(a.x+b.x)/2,-.075,(a.z+b.z)/2,len,.13,t.width,hallMat,{type:'tunnel',id:t.id});floor.rotation.y=angle;this.selectable.push(floor);
  }
  for(const room of s.rooms){
   const shape=new THREE.Shape(room.polygon.map(p=>new THREE.Vector2(p.x,p.z)));const geom=new THREE.ShapeGeometry(shape);geom.rotateX(Math.PI/2);
   const mesh=new THREE.Mesh(geom,new THREE.MeshStandardMaterial({color:floorMat.color,roughness:.96,side:THREE.DoubleSide}));mesh.position.y=-.026;mesh.userData.pick={type:'room',id:room.id};this.world.add(mesh);this.selectable.push(mesh);
  }
  if(this.showWalls!==false)for(const [a,b] of caveBoundary(s)){
   const dx=b.x-a.x,dz=b.z-a.z;
   const height=Math.min(s.architecturalHeight,3.1+Math.abs(Math.sin(a.x*.57+a.z*.21))*3);
   const wall=box(this.world,(a.x+b.x)/2,height/2,(a.z+b.z)/2,Math.hypot(dx,dz),height,.4,wallMat);
   wall.rotation.y=-Math.atan2(dz,dx);
  }
 }
 renderGizmos(s){
  if(!this.showGizmos)return;
  const makeMarker=(pos,color,label,pick)=>{
   const mat=material(color,{emissive:color,emissiveIntensity:.36});
   const y=sampleTerrain(s.terrain,pos)?.y||0;
   const marker=cylinder(this.helperRoot,pos.x,y+.43,pos.z,.65,.65,.18,mat,12);marker.userData.pick=pick;this.selectable.push(marker);
   const o=cone(this.helperRoot,pos.x,y+1.15,pos.z,.4,.80,mat,5);o.userData.pick=pick;this.selectable.push(o);
  };
  for(const obj of s.interactables)makeMarker(obj.position,'#f9c86f','Interact',{type:'interaction',id:obj.id});
  for(const tr of this.mission.transitions.filter(x=>x.fromSegmentId===s.id))makeMarker(tr.fromAnchor,tr.kind==='portal'?'#d49eff':'#56e5ff','Transition',{type:'transition',id:tr.id});
  for(const obj of this.mission.objectives.filter(x=>x.segmentId===s.id))makeMarker(obj.position,'#75ffb4','Objective',{type:'objective',id:obj.id});
  const entry=s.anchors.entry;makeMarker(entry,'#74adff','Entry',{type:'anchor',id:'entry'});
 }
 highlight(id){this.needsRender=true;this.selectedId=id;this.helperRoot.children.filter(o=>o.userData.selection).forEach(o=>{o.geometry?.dispose();o.material?.dispose();this.helperRoot.remove(o)});
  const room=this.segment?.rooms.find(r=>r.id===id);if(!room)return;
  if(room.bounds){const b=room.bounds;const m=box(this.helperRoot,b.x,-.012,b.z,b.w,.055,b.d,new THREE.MeshBasicMaterial({color:'#21e4d3',transparent:true,opacity:.19,depthWrite:false}));m.userData.selection=true;}
  else if(room.polygon){
   const points=room.polygon.map(p=>new THREE.Vector3(p.x,(sampleTerrain(this.segment.terrain,p)?.y??room.center.y??0)+.15,p.z));
   const outline=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#35f6e1'}));
   outline.userData.selection=true;this.helperRoot.add(outline);
  }
 }
 setDoorStates(openIds){this.needsRender=true;for(const [id,m] of this.doorMeshes)m.visible=!openIds.has(id)}
 setAvatar(pos,enabled){this.needsRender=true;this.avatar.position.set(pos?.x||0,pos?.y||0,pos?.z||0);this.avatar.visible=!!enabled}
 walkCamera(pos){
  const first=this.segment.tunnels[0],direction=new THREE.Vector3(.7,0,.7);
  if(first)direction.set(first.toPosition.x-first.fromPosition.x,0,first.toPosition.z-first.fromPosition.z).normalize();
  this.controls.target.set(pos.x,pos.y+1.25,pos.z);
  this.camera.position.copy(this.controls.target).addScaledVector(direction,-7);
  this.camera.position.y+=2.7;
  this.controls.update();this.needsRender=true;
 }
 follow(pos){if(!pos)return;const target=new THREE.Vector3(pos.x,pos.y||0,pos.z),delta=target.clone().sub(this.controls.target);this.controls.target.add(delta.multiplyScalar(.08));this.camera.position.add(delta)}
 fit(){if(!this.segment)return;let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  const coords=[];
  for(const c of this.segment.corridors)coords.push({x:c.bounds.x-c.bounds.w/2,z:c.bounds.z-c.bounds.d/2},{x:c.bounds.x+c.bounds.w/2,z:c.bounds.z+c.bounds.d/2});
  for(const r of this.segment.rooms){if(r.bounds)coords.push({x:r.bounds.x-r.bounds.w/2,z:r.bounds.z-r.bounds.d/2},{x:r.bounds.x+r.bounds.w/2,z:r.bounds.z+r.bounds.d/2});else coords.push(...r.polygon)}
  for(const p of coords){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z)}
  if(this.segment.terrain)({minX,maxX,minZ,maxZ}=this.segment.bounds);
  const span=Math.max(maxX-minX,maxZ-minZ);
  this.grid.position.set((minX+maxX)/2,(this.segment.terrain?.stats.elevationMin||0)-.17,(minZ+maxZ)/2);
  this.grid.scale.setScalar(Math.max(.2,span/340));
  this.frameBounds({minX,maxX,minZ,maxZ});
 }
 frameBounds({minX,maxX,minZ,maxZ,minY,maxY}){
  const cx=(minX+maxX)/2,cz=(minZ+maxZ)/2,size=Math.max(maxX-minX,maxZ-minZ,18);
  const halfFov=THREE.MathUtils.degToRad(this.camera.fov/2);
  const direction=this.camera.position.clone().sub(this.controls.target).normalize();
  const right=new THREE.Vector3().crossVectors(this.camera.up,direction).normalize();
  const up=new THREE.Vector3().crossVectors(direction,right).normalize();
  const ground=minY??this.segment.terrain?.stats.elevationMin??0;
  const halfHeight=((maxY??(ground+this.segment.architecturalHeight))-ground)/2;
  const tanV=Math.tan(halfFov),tanH=tanV*this.camera.aspect;
  let distance=12;
  for(const x of [minX-cx,maxX-cx])for(const z of [minZ-cz,maxZ-cz])for(const y of [-halfHeight,halfHeight]){
   const corner=new THREE.Vector3(x,y,z);
   distance=Math.max(distance,corner.dot(direction)+Math.max(Math.abs(corner.dot(right))/tanH,Math.abs(corner.dot(up))/tanV)*1.21);
  }
  this.controls.maxDistance=Math.max(310,distance*2.8);
  this.controls.target.set(cx,ground+halfHeight,cz);
  this.camera.position.copy(this.controls.target).addScaledVector(direction,distance);
  this.scene.fog.near=distance+size*.4;this.scene.fog.far=distance+size*3;
  this.needsRender=true;
  this.camera.far=Math.max(900,this.controls.maxDistance+size*2);this.camera.updateProjectionMatrix();this.controls.update();
 }
 focusRoom(id){
  const room=this.segment?.rooms.find(room=>room.id===id);
  if(!room)return;
  const b=room.bounds;
  const local=sampleTerrain(this.segment.terrain,room.center);
  this.frameBounds(b?{minX:b.x-b.w/2,maxX:b.x+b.w/2,minZ:b.z-b.d/2,maxZ:b.z+b.d/2}:{
   minX:Math.min(...room.polygon.map(p=>p.x)),maxX:Math.max(...room.polygon.map(p=>p.x)),
   minZ:Math.min(...room.polygon.map(p=>p.z)),maxZ:Math.max(...room.polygon.map(p=>p.z)),
   minY:local?.y,maxY:local?local.y+local.clearance:undefined,
  });
 }
 isometricView(){
  const target=this.controls.target;
  const distance=this.camera.position.distanceTo(target);
  this.camera.position.copy(target).addScaledVector(new THREE.Vector3(1,1,1).normalize(),distance);
  this.controls.update();this.needsRender=true;
 }
 topView(){if(!this.segment)return;this.needsRender=true;const target=this.controls.target.clone(),dist=this.camera.position.distanceTo(target);this.camera.position.set(target.x+.01,Math.max(25,dist),target.z+.01);this.controls.update()}
 toggleGrid(v){this.needsRender=true;this.showGrid=v;this.grid.visible=v}
 snapshot(){this.renderer.render(this.scene,this.camera);const a=document.createElement('a');a.href=this.canvas.toDataURL('image/png');a.download=`b-mission-${this.segment?.id||'preview'}.png`;a.click()}
 async exportVisibleGLB(){const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js');const g=new THREE.Group();g.name=`B-Zone-Mission-${this.segment?.id}`;
  // Export only actual environment geometry, not the debug/selection helpers.
  for(const obj of this.world.children){
   if(!obj.visible&&!obj.userData.caveSurface)continue;
   const copy=obj.clone(true);
   if(obj.userData.caveSurface)copy.visible=true;
   g.add(copy);
  }
  const data=await new Promise((res,rej)=>new GLTFExporter().parse(g,res,rej,{binary:true,onlyVisible:true}));const blob=new Blob([data],{type:'model/gltf-binary'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=`b-zone-${this.segment?.id||'segment'}.glb`;a.click();setTimeout(()=>URL.revokeObjectURL(u),3000);
 }
 destroy(){this.alive=false;this.ro.disconnect();this.clear();this.controls.dispose();this.renderer.dispose()}
}
