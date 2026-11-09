import test from 'node:test';
import assert from 'node:assert/strict';
import {financialScenario,filteredInitiatives} from '../components/financials.js';
const i={kwh:60,tariff:1,cost:100,emission:1};
test('NPV, IRR and fractional payback match known two-year cash flows',()=>{
 const f=financialScenario(i,{years:2,discount:0,escalation:0});assert.equal(f.npv,20);assert.ok(Math.abs(f.irr-13.066238629)<1e-7);assert.ok(Math.abs(f.escalatingPayback-5/3)<1e-10);assert.deepEqual(f.flows,[-100,60,60]);
 const discounted=financialScenario(i,{years:2,discount:10,escalation:0});assert.ok(Math.abs(discounted.npv-4.1322314049)<1e-8);assert.ok(discounted.discountedPayback>f.escalatingPayback);
});
test('escalation, maintenance and carbon remain separate, with explicit edge cases',()=>{
 const base=financialScenario(i,{years:3,escalation:0});const rising=financialScenario(i,{years:3,escalation:20,carbonPrice:1000});assert.ok(rising.escalatingPayback<base.escalatingPayback);assert.ok(rising.npv>base.npv);assert.equal(rising.carbonValue,60);assert.equal(rising.npv,financialScenario(i,{years:3,escalation:20}).npv);
 assert.equal(financialScenario({...i,kwh:0}).irr,null);assert.equal(financialScenario({...i,kwh:0}).escalatingPayback,null);assert.equal(financialScenario({...i,cost:0}).irr,null);assert.equal(financialScenario({...i,cost:0}).escalatingPayback,0);assert.equal(financialScenario(i,{maintenance:1000}).irr,null);
 for(const a of [{years:2.5},{discount:-1},{escalation:Infinity},{carbonPrice:-1}])assert.throws(()=>financialScenario(i,a));
});
test('savings filters combine province, rating and initiative status',()=>{
 const d={assessments:[{id:'a',province:'Gauteng',result:{grade:'F'}},{id:'b',province:'Western Cape',result:{grade:'A'}}],initiatives:[{assessmentId:'a',status:'Proposed'},{assessmentId:'a',status:'Completed'},{assessmentId:'b',status:'Proposed'}]};assert.equal(filteredInitiatives(d,{province:'Gauteng',rating:'F',status:'Proposed'}).length,1);assert.equal(filteredInitiatives(d,{province:'Gauteng',rating:'A'}).length,0);assert.equal(filteredInitiatives(d).length,3);
});
