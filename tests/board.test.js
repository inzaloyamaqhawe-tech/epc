import test from 'node:test';
import assert from 'node:assert/strict';
import {targetsFor,installBoardDrag} from '../assets/board.js';
test('board stage policy respects sequence, role and independent review',()=>{
 const admin={id:'owner',role:'Admin'};
 assert.deepEqual(targetsFor({status:'Draft'},admin),['Submitted']);
 assert.deepEqual(targetsFor({status:'Approved'},admin,true),[]);
 assert.deepEqual(targetsFor({status:'Submitted',createdBy:'owner'},admin),[]);
 assert.deepEqual(targetsFor({status:'Submitted',createdBy:'owner'},admin,true),['Under Review']);
 assert.deepEqual(targetsFor({status:'Under Review'},{id:'reviewer',role:'Reviewer'}),['Approved','Revision Required']);
 assert.deepEqual(targetsFor({status:'Draft'},{role:'Property Owner'}),[]);
});
test('drag controller moves internal cards only and rejects invalid drops',async()=>{
 const handlers={},moves=[],errors=[];const card={dataset:{id:'a'},classList:{add(){}}};const column={dataset:{dropStatus:'Under Review'},classList:{toggle(){},add(){},remove(){}}};
 const root={addEventListener:(name,fn)=>handlers[name]=fn,querySelectorAll:()=>[]};
 installBoardDrag({root,find:id=>id==='a'?{id,status:'Submitted'}:null,targets:()=>['Under Review'],onMove:(...args)=>moves.push(args),onError:message=>errors.push(message)});
 const event=target=>({target:{closest:()=>target},dataTransfer:{setData(){}},preventDefault(){this.prevented=true;}});
 handlers.drop(event(column));assert.equal(moves.length,0);
 handlers.dragstart(event(card));const over=event(column);handlers.dragover(over);assert.ok(over.prevented);handlers.drop(event(column));await Promise.resolve();assert.deepEqual(moves,[['a','Under Review']]);
 handlers.dragstart(event(card));column.dataset.dropStatus='Approved';handlers.drop(event(column));assert.equal(moves.length,1);assert.equal(errors.length,1);
});
