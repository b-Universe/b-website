import test from 'node:test';
import assert from 'node:assert/strict';
import { newStory,newMission,validateStory,simulateMission,importStory } from './story-core.js';
import { generateMission } from './mission-core.js';

test('100 missions preserve ordering and a pinned map through a story round trip',()=>{
 const arc=newStory();
 arc.missions=Array.from({length:100},newMission);
 arc.missions[0].map=generateMission({archetype:'warehouse',seed:4402});
 assert.equal(arc.missions[0].map.validation.ok,true);
 assert.deepEqual(importStory(JSON.parse(JSON.stringify(arc))),arc);
 arc.missions.push(newMission());
 assert.ok(validateStory(arc,{draft:true}).length);
});
test('objective events respect quantities, dependencies and activation',()=>{
 const arc=newStory(),mission=arc.missions[0];
 mission.objectives=[
  {id:'cargo',type:'collect',event:'collect',quantity:2,required:true,dependsOn:[]},
  {id:'escort',type:'escort',event:'arrive',quantity:1,required:true,dependsOn:['cargo'],manual:true},
 ];
 mission.rules=[{event:'complete',source:'cargo',requires:'',action:'activate',target:'escort'},
  {event:'complete',source:'escort',requires:'',action:'unlock',target:'exit'}];
 assert.deepEqual(validateStory(arc,{draft:true}),[]);
 const run=simulateMission(mission);
 assert.equal(run.record('escort','arrive'),false);
 assert.ok(run.record('cargo','collect'));assert.equal(run.status.escort,'inactive');
 assert.ok(run.record('cargo','collect'));assert.ok(run.record('escort','arrive'));
 assert.ok(run.done());assert.ok(run.effects.doors.has('exit'));
 mission.objectives[0].dependsOn=['escort'];
 assert.match(validateStory(arc,{draft:true}).join(' '),/cycle/);
});
