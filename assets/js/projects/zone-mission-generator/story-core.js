export const STORY_SCHEMA = 'b.story-arc.v1';
export const TYPES = ['boss','defeat-all','collect','interact','rescue','ally','ambush','escort','patrol','npc-battle','destructible','defendable'];
export const EVENTS = ['start','enter-region','defeat','collect','interact','rescue','arrive','timer','complete','fail'];
export const ACTIONS = ['activate','spawn','unlock','enable-elevator','clue','compass','dialogue','flag','complete','fail'];
export const DIALOGUE = ['Introduction','Send off','Compass active task','Still busy','Return success','Failure','Objective update','Mission completion'];
export const id = () => crypto.randomUUID();
export function newMission() {
  return { id:id(), title:'New mission', enemyGroup:'', map:null, mapType:'office', length:'standard', minLevel:1,
    maxLevel:50, pacing:'standard', minutes:0, exit:'return-contact', beginClue:'', endClue:'',
    dialogue:Object.fromEntries(DIALOGUE.map(key=>[key,''])), objectives:[], encounters:[], rules:[] };
}
export function newStory() {
  return { schemaVersion:STORY_SCHEMA, id:id(), title:'', description:'', subtitle:'', tags:'', authorNotes:'',
    alignment:'any', status:'draft', contact:{type:'none',name:'',npcRef:'',dialogue:''},
    souvenir:{title:'',description:''}, enemyGroups:[], missions:[newMission()] };
}
export function validateStory(story, { draft = false } = {}) {
  const errors=[];
  if(story?.schemaVersion!==STORY_SCHEMA || !Array.isArray(story.missions) || !story.missions.length || story.missions.length>100)
    return ['Expected a versioned story arc with 1–100 missions.'];
  if(!draft && (!story.title?.trim() || !story.description?.trim()))errors.push('Enter a story title and description.');
  if(!story.id||!story.contact||!story.souvenir||!Array.isArray(story.enemyGroups))
    return ['Missing arc metadata.'];
  const missionIds=new Set();
  for(const mission of story.missions){
    if(!mission?.id||missionIds.has(mission.id)){errors.push('Each mission needs a unique ID.');continue;}
    missionIds.add(mission.id);
    if(!Array.isArray(mission.objectives)||!Array.isArray(mission.rules)||!Array.isArray(mission.encounters)||!mission.dialogue){errors.push('Mission objectives and rules must be lists.');continue;}
    if(!Number.isInteger(mission.minLevel)||!Number.isInteger(mission.maxLevel)||mission.minLevel<1||mission.maxLevel>50||mission.minLevel>mission.maxLevel)errors.push('Invalid mission level range.');
    if(!Number.isFinite(mission.minutes)||mission.minutes<0||mission.minutes>240)errors.push('Invalid mission timer.');
    if(!draft && (!mission.title?.trim() || !mission.map))errors.push('Each mission needs a title and selected map.');
    if(mission.map && (mission.map.schemaVersion!=='b.zone-mission.v1'||!Array.isArray(mission.map.segments)))errors.push('Invalid zone blueprint.');
    const objectives=new Map(mission.objectives.map(o=>[o.id,o]));
    if(objectives.size!==mission.objectives.length)errors.push('Duplicate objective IDs.');
    const active=new Set(), visited=new Set();
    function visit(key){
      if(active.has(key)){errors.push('Objective dependency cycle.');return;}
      if(visited.has(key)||!objectives.has(key))return;
      active.add(key);
      for(const dependency of objectives.get(key).dependsOn||[]) {
        if(!objectives.has(dependency))errors.push('Missing objective dependency.');
        else visit(dependency);
      }
      active.delete(key);visited.add(key);
    }
    for(const objective of mission.objectives){
      if(!objective.id||!TYPES.includes(objective.type)||!EVENTS.includes(objective.event)||!Array.isArray(objective.dependsOn)||!Number.isInteger(objective.quantity)||objective.quantity<1)errors.push('Invalid objective definition.');
      visit(objective.id);
    }
    for(const rule of mission.rules){
      if(!EVENTS.includes(rule.event)||!ACTIONS.includes(rule.action)||
        (rule.source&&!objectives.has(rule.source))||(rule.requires&&!objectives.has(rule.requires))||
        (['activate','complete','fail'].includes(rule.action)&&!objectives.has(rule.target)))errors.push('Invalid event rule or objective reference.');
    }
  }
  return [...new Set(errors)];
}
export function importStory(raw) {
  const story=structuredClone(raw);
  const errors=validateStory(story,{draft:true});
  if(errors.length)throw Error(errors.join(' '));
  return story;
}
export function simulateMission(mission) {
  const status=Object.fromEntries(mission.objectives.map(o=>[o.id,o.manual?'inactive':'pending']));
  const counts=Object.create(null), log=[], fired=new Set();
  const effects={flags:new Set(),clues:new Set(),doors:new Set(),elevators:new Set(),encounters:new Set(),compass:'',dialogue:''};
  const collections={flag:'flags',clue:'clues',unlock:'doors','enable-elevator':'elevators',spawn:'encounters'};
  const ready=o=>status[o.id]==='pending'&&o.dependsOn.every(key=>status[key]==='complete');
  function emit(event,source=''){
    const queue=[[event,source]];
    while(queue.length){
      const [kind,key]=queue.shift();
      for(const [index,rule] of mission.rules.entries()){
        if(fired.has(index)||rule.event!==kind||(rule.source&&rule.source!==key)||(rule.requires&&status[rule.requires]!=='complete'))continue;
        const target=mission.objectives.find(o=>o.id===rule.target);
        if(rule.action==='complete'&&(!target||!ready(target)))continue;
        fired.add(index);
        if(rule.action==='activate'&&status[rule.target]==='inactive')status[rule.target]='pending';
        if(rule.action==='complete'||rule.action==='fail'){
          status[rule.target]=rule.action==='complete'?'complete':'failed';
          queue.push([rule.action,rule.target]);
        }
        if(collections[rule.action])effects[collections[rule.action]].add(rule.target);
        if(rule.action==='compass'||rule.action==='dialogue')effects[rule.action]=rule.target;
        log.push([rule.action,rule.target].filter(Boolean).join(' · '));
      }
    }
  }
  emit('start');
  return {status,counts,log,effects,ready,emit,
    record(key,event){
      const objective=mission.objectives.find(o=>o.id===key);
      if(!objective||!ready(objective)||event!==objective.event)return false;
      counts[key]=(counts[key]||0)+1;
      if(counts[key]>=objective.quantity){status[key]='complete';emit('complete',key);}
      emit(event,key);
      return true;
    },
    done:()=>mission.objectives.every(o=>!o.required||status[o.id]==='complete')
  };
}
