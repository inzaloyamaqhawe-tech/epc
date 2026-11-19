import test from 'node:test';
import assert from 'node:assert/strict';
import {beamSites} from '../assets/beam-sites.js';
import {solar,solarPreview} from '../components/solar.js';

test('solar reports preserve partial-period observations without creating assessment inputs',()=>{
  const state={data:{solarSites:structuredClone(beamSites),assessments:[]},search:''};
  const before=structuredClone(state);
  const html=solar(state);
  assert.match(html,/Thembokwezi/);assert.match(html,/Kgalauwane House/);
  assert.match(html,/Capacity not recorded/);
  assert.match(html,/34 kWh difference/);
  assert.match(html,/power at that moment, not period energy/);
  assert.match(html,/80-day reporting period/);
  assert.doesNotMatch(html,/grade-outline|R\s+\d/);
  assert.deepEqual(state,before);
  assert.match(solarPreview(state),/View solar sites/);
  assert.equal(solarPreview({data:{}}),'');
});

test('solar site search and source text escape untrusted markup',()=>{
  const sites=structuredClone(beamSites);sites[1].name='<img src=x onerror=alert(1)>';
  let html=solar({data:{solarSites:sites},search:'thembokwezi'});
  assert.match(html,/Thembokwezi/);assert.doesNotMatch(html,/Kgalauwane House/);
  html=solar({data:{solarSites:sites},search:''});
  assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);assert.doesNotMatch(html,/<img src=x/);
});
