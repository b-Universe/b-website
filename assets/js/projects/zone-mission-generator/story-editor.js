import { ACTIONS, DIALOGUE, EVENTS, TYPES, id, importStory, newMission, newStory, simulateMission, validateStory } from './story-core.js';
import { ARCHETYPES, generateMission } from './mission-core.js';

const editor=document.querySelector('#story-editor');
const content=document.querySelector('#story-content');
const status=document.querySelector('#story-status');
const database=new Promise((resolve,reject)=>{
  const request=indexedDB.open('b-story-architect',2);
  request.onupgradeneeded=()=>{
    const db=request.result;
    if(!db.objectStoreNames.contains('arcs'))db.createObjectStore('arcs',{keyPath:'id'});
    if(!db.objectStoreNames.contains('revisions'))db.createObjectStore('revisions',{keyPath:'id'}).createIndex('arc','arcId');
  };
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
});
const saveTimers=new Map();
let story=newStory(), index=0, tab='Story settings', candidates=[], run=null, runTimer;
const tabs=['Story settings','Mission settings','Dialogue','Objectives & events','Test story','Library'];
const mission=()=>story.missions[index];
const report=message=>{status.textContent=message;};
function save(){
  const activeStory=story;
  clearTimeout(saveTimers.get(activeStory.id));
  const timer=setTimeout(async()=>{
    saveTimers.delete(activeStory.id);
    try{
      const db=await database;
      const transaction=db.transaction('arcs','readwrite');
      transaction.objectStore('arcs').put({...activeStory,updatedAt:Date.now()});
      transaction.oncomplete=()=>report('Saved locally');
      transaction.onerror=()=>report('Autosave failed');
    }catch(error){report(error.message);}
  },250);
  saveTimers.set(activeStory.id,timer);
}
function element(tag,text,parent){
  const node=document.createElement(tag);
  if(text)node.textContent=text;
  if(parent)parent.append(node);
  return node;
}
function button(label,action,parent){
  const node=element('button',label,parent);
  node.type='button';
  node.className='button button-secondary';
  node.onclick=()=>{try{Promise.resolve(action()).catch(error=>report(error.message));}catch(error){report(error.message);}};
  return node;
}
function field(parent,label,object,key,options){
  const row=element('label',label,parent);
  const input=element(Array.isArray(options)?'select':options==='long'?'textarea':'input','',row);
  if(Array.isArray(options))for(const value of options)input.add(new Option(value,value));
  else if(options!=='long')input.type=options||'text';
  if(options==='checkbox')input.checked=Boolean(object[key]);
  else input.value=object[key]??'';
  input.oninput=()=>{
    object[key]=options==='checkbox'?input.checked:options==='number'?Number(input.value):input.value;
    save();
  };
  return input;
}
function selectMission(next){index=next;candidates=[];render();}
function download(){
  const errors=validateStory(story);
  if(errors.length){report(errors.join(' '));return;}
  const link=element('a');
  link.href=URL.createObjectURL(new Blob([JSON.stringify(story,null,2)],{type:'application/json'}));
  link.download='b-story-arc.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(link.href),1000);
}
function render(){
  content.replaceChildren();
  const navigation=editor.querySelector('#story-tabs');
  navigation.replaceChildren();
  for(const name of tabs){
    const control=button(name,()=>{tab=name;render();},navigation);
    control.setAttribute('aria-pressed',String(tab===name));
  }
  const sequence=editor.querySelector('#story-sequence');
  sequence.replaceChildren();
  const picker=element('select','',sequence);
  picker.setAttribute('aria-label','Active story mission');
  story.missions.forEach((item,i)=>picker.add(new Option((i+1)+' · '+item.title,i)));
  picker.value=index;
  picker.onchange=()=>selectMission(Number(picker.value));
  button('Add mission',()=>{
    if(story.missions.length>=100)return report('This arc already has 100 missions.');
    story.missions.push(newMission());selectMission(story.missions.length-1);save();
  },sequence);
  for(const [label,direction] of [['Move earlier',-1],['Move later',1]])button(label,()=>{
    const next=index+direction;
    if(next<0||next>=story.missions.length)return;
    [story.missions[index],story.missions[next]]=[story.missions[next],story.missions[index]];
    selectMission(next);save();
  },sequence);
  button('Duplicate',()=>{
    if(story.missions.length>=100)return report('This arc already has 100 missions.');
    const copy=structuredClone(mission());copy.id=id();
    story.missions.splice(index+1,0,copy);selectMission(index+1);save();
  },sequence);
  button('Remove mission',()=>{
    if(story.missions.length===1||!confirm('Remove this mission from the arc?'))return;
    story.missions.splice(index,1);selectMission(Math.min(index,story.missions.length-1));save();
  },sequence);
  if(tab==='Story settings')drawStory();
  if(tab==='Mission settings')drawMission();
  if(tab==='Dialogue')for(const key of DIALOGUE)field(content,key,mission().dialogue,key,'long');
  if(tab==='Objectives & events')drawObjectives();
  if(tab==='Test story')drawTest();
  if(tab==='Library')drawLibrary().catch(error=>report(error.message));
}
function drawStory(){
  for(const [label,key,kind] of [['Story title','title'],['Description','description','long'],['Subtitle','subtitle'],['Tags','tags'],['Author notes','authorNotes','long'],['Alignment','alignment',['any','hero','villain','neutral']],['Status','status',['draft','ready','published','archived']]])field(content,label,story,key,kind);
  const contact=element('fieldset','',content);element('legend','Contact',contact);
  field(contact,'Contact type',story.contact,'type',['none','npc','remote','custom']);
  field(contact,'Name',story.contact,'name');field(contact,'NPC reference',story.contact,'npcRef');
  field(contact,'Contact dialogue',story.contact,'dialogue','long');
  const souvenir=element('fieldset','',content);element('legend','Story souvenir',souvenir);
  field(souvenir,'Title',story.souvenir,'title');field(souvenir,'Description',story.souvenir,'description','long');
  const groups=element('fieldset','',content);element('legend','Custom enemy groups',groups);
  for(const group of story.enemyGroups){
    field(groups,'Group name',group,'name');field(groups,'NPC references (comma-separated)',group,'members');
  }
  button('Add custom group',()=>{story.enemyGroups.push({id:id(),name:'New group',members:''});render();save();},groups);
}
function drawMission(){
  const item=mission();
  for(const [label,key,kind] of [['Mission title','title'],['Enemy group reference','enemyGroup'],['Map type','mapType',Object.keys(ARCHETYPES)],['Length','length',['short','standard','long']],['Minimum level','minLevel','number'],['Maximum level','maxLevel','number'],['Pacing','pacing',['quiet','standard','intense']],['Time limit in minutes (0 for none)','minutes','number'],['Exit','exit',['return-contact','next-mission','return-zone']],['Begin clue','beginClue','long'],['Completion clue','endClue','long']])field(content,label,item,key,kind);
  const gallery=element('fieldset','',content);element('legend','Map gallery',gallery);
  element('p',item.map?'Selected map · '+item.map.identity.label:'Choose a candidate or attach the workshop map.',gallery);
  button('Generate three candidates',()=>{
    const rooms={short:9,standard:18,long:34}[item.length];
    const first=crypto.getRandomValues(new Uint32Array(1))[0]||1;
    candidates=Array.from({length:3},(_,i)=>generateMission({archetype:item.mapType,seed:(first+i)>>>0,rooms,
      floors:item.length==='long'?2:1,encounterDensity:{quiet:15,standard:45,intense:80}[item.pacing]}));
    render();
  },gallery);
  button('Attach workshop map',()=>{
    const studio=window.BZoneMissionStudio;
    if(!studio)return report('Wait for the map workshop to load.');
    item.map=studio.serializeMission(studio.getMission());render();save();
  },gallery);
  if(item.map)button('Open selected map in workshop',()=>window.BZoneMissionStudio?.openBlueprint(item.map),gallery);
  for(const blueprint of candidates){
    const card=element('fieldset','',gallery);
    element('legend',blueprint.identity.label,card);
    element('p',blueprint.validation.totals.rooms+' spaces · '+blueprint.segments.length+' segments',card);
    button('Preview in workshop',()=>window.BZoneMissionStudio?.openBlueprint(blueprint),card);
    button('Select map',()=>{item.map=structuredClone(blueprint);render();save();},card);
  }
}
function drawObjectives(){
  const item=mission();
  for(const [i,objective] of item.objectives.entries()){
    const card=element('fieldset','',content);element('legend','Objective '+(i+1),card);
    field(card,'Title',objective,'title');field(card,'Type',objective,'type',TYPES);
    field(card,'Completion event',objective,'event',EVENTS);
    field(card,'Quantity',objective,'quantity','number');
    field(card,'Required',objective,'required','checkbox');
    field(card,'Starts inactive',objective,'manual','checkbox');
    field(card,'NPC or object reference',objective,'assetRef');
    field(card,'Room / anchor reference',objective,'anchor');
    field(card,'Dialogue',objective,'dialogue','long');field(card,'Clue',objective,'clue','long');
    const dependencies=element('fieldset','',card);element('legend','Requires completion of',dependencies);
    for(const other of item.objectives.filter(o=>o.id!==objective.id)){
      const choice={selected:objective.dependsOn.includes(other.id)};
      field(dependencies,other.title,choice,'selected','checkbox').onchange=()=>{
        objective.dependsOn=choice.selected?[...new Set([...objective.dependsOn,other.id])]:objective.dependsOn.filter(key=>key!==other.id);save();
      };
    }
    button('Remove objective',()=>{
      item.objectives.splice(i,1);
      item.rules=item.rules.filter(rule=>![rule.source,rule.requires,rule.target].includes(objective.id));
      for(const other of item.objectives)other.dependsOn=other.dependsOn.filter(key=>key!==objective.id);
      render();save();
    },card);
  }
  button('Add objective',()=>{
    item.objectives.push({id:id(),title:'New objective',type:'interact',event:'interact',quantity:1,required:true,manual:false,dependsOn:[],assetRef:'',anchor:'',dialogue:'',clue:''});
    render();save();
  },content);
  function reference(card,label,rule,key){
    const row=element('label',label,card), selector=element('select','',row);
    selector.add(new Option('None',''));
    for(const objective of item.objectives)selector.add(new Option(objective.title,objective.id));
    selector.value=rule[key];selector.onchange=()=>{rule[key]=selector.value;save();};
  }
  for(const [i,rule] of item.rules.entries()){
    const card=element('fieldset','',content);element('legend','Event rule '+(i+1),card);
    field(card,'When',rule,'event',EVENTS);reference(card,'Event objective',rule,'source');
    reference(card,'Requires objective',rule,'requires');
    field(card,'Action',rule,'action',ACTIONS).onchange=()=>render();
    if(['activate','complete','fail'].includes(rule.action))reference(card,'Target objective',rule,'target');
    else field(card,'Action value or reference',rule,'target');
    button('Remove rule',()=>{item.rules.splice(i,1);render();save();},card);
  }
  button('Add event rule',()=>{item.rules.push({event:'start',source:'',requires:'',action:'dialogue',target:''});render();save();},content);
  const encounters=element('fieldset','',content);element('legend','Encounters',encounters);
  for(const [i,encounter] of item.encounters.entries()){
    field(encounters,'NPC or enemy group reference',encounter,'reference');
    field(encounters,'Room or anchor',encounter,'anchor');
    field(encounters,'Group size',encounter,'quantity','number');
    button('Remove encounter',()=>{item.encounters.splice(i,1);render();save();},encounters);
  }
  button('Add encounter',()=>{item.encounters.push({id:id(),reference:'',anchor:'',quantity:1});render();save();},encounters);
}
function start(at,advance){
  const errors=validateStory(story,{draft:true});
  if(errors.length)return report(errors.join(' '));
  clearTimeout(runTimer);
  const definition=structuredClone(story.missions[at]), simulator=simulateMission(definition);
  const current={index:at,advance,definition,simulator};
  run=current;
  if(definition.minutes>0)runTimer=setTimeout(()=>{
    if(run!==current||simulator.done())return;
    simulator.emit('timer');
    if(tab==='Test story')render();
  },definition.minutes*60000);
  render();
}
function drawTest(){
  button('Test current mission',()=>start(index,false),content);
  button('Test from beginning',()=>start(0,true),content);
  if(!run)return;
  const {simulator,definition}=run;
  element('h3',definition.title,content);
  element('p',definition.dialogue.Introduction,content);
  for(const objective of definition.objectives){
    const control=button(objective.title+' · '+simulator.status[objective.id]+' · '+(simulator.counts[objective.id]||0)+'/'+objective.quantity,()=>{
      simulator.record(objective.id,objective.event);render();
    },content);
    control.disabled=!simulator.ready(objective);
  }
  button('Simulate timer expiry',()=>{simulator.emit('timer');render();},content);
  for(const event of simulator.log)element('p',event,content);
  if(simulator.done()){
    element('p',definition.dialogue['Return success']||'Mission complete',content);
    if(run.advance&&run.index+1<story.missions.length)button('Continue to next mission',()=>start(run.index+1,true),content);
    else if(run.advance&&story.souvenir.title)element('p','Souvenir earned · '+story.souvenir.title,content);
  }
}
async function drawLibrary(){
  const search=element('input','',content);search.placeholder='Search local arcs';search.setAttribute('aria-label','Search local arcs');
  const results=element('div','',content);
  const db=await database;
  const history=element('fieldset','',content);
  element('legend','Checkpoints for this arc',history);
  const snapshots=db.transaction('revisions').objectStore('revisions').index('arc').getAll(story.id);
  snapshots.onsuccess=()=>{
    for(const snapshot of snapshots.result.sort((a,b)=>b.at-a.at)){
      button('Restore '+new Date(snapshot.at).toLocaleString(),()=>{
        if(!confirm('Restore this checkpoint as a separate draft?'))return;
        story=importStory(snapshot.story);story.id=id();story.status='draft';index=0;run=null;candidates=[];tab='Story settings';render();save();
      },history);
    }
  };
  const request=db.transaction('arcs').objectStore('arcs').getAll();
  request.onsuccess=()=>{
    const update=()=>{
      results.replaceChildren();
      for(const entry of request.result.sort((a,b)=>b.updatedAt-a.updatedAt)){
        if(!(entry.title+' '+entry.description).toLowerCase().includes(search.value.toLowerCase()))continue;
        button((entry.title||'Untitled')+' · '+entry.status+' · '+entry.missions.length+' missions',()=>{
          story=importStory(entry);index=0;tab='Story settings';run=null;candidates=[];render();
        },results);
      }
    };
    search.oninput=update;update();
  };
}
button('New arc',()=>{story=newStory();index=0;tab='Story settings';run=null;candidates=[];render();save();},editor.querySelector('#story-actions'));
button('Save checkpoint',async()=>{
  const activeStory=structuredClone(story), db=await database;
  const transaction=db.transaction('revisions','readwrite');
  transaction.objectStore('revisions').add({id:id(),arcId:activeStory.id,at:Date.now(),story:activeStory});
  transaction.oncomplete=()=>report('Checkpoint saved');
  transaction.onerror=()=>report('Could not save checkpoint');
},editor.querySelector('#story-actions'));
button('Validate arc',()=>{const errors=validateStory(story);report(errors.join(' ')||'Arc validation passed');},editor.querySelector('#story-actions'));
button('Export arc',download,editor.querySelector('#story-actions'));
const upload=editor.querySelector('#story-import');
button('Import arc',()=>upload.click(),editor.querySelector('#story-actions'));
upload.onchange=async()=>{
  try{story=importStory(JSON.parse(await upload.files[0].text()));index=0;run=null;candidates=[];render();save();}
  catch(error){report(error.message);}finally{upload.value='';}
};
render();
