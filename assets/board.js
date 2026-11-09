// A shared policy for board affordances; server authorization remains authoritative.
export function targetsFor(assessment,user,local=false){
 const edit=['Admin','Super Admin','Assessor','Energy Manager'].includes(user?.role);
 const review=['Admin','Super Admin','Reviewer'].includes(user?.role)&&
   (local||![assessment.createdBy,assessment.lastEditedBy,assessment.submittedBy].includes(user?.id));
 return ['Draft','Revision Required'].includes(assessment.status)?(edit?['Submitted']:[]):
 assessment.status==='Submitted'?(review?['Under Review']:[]):
 assessment.status==='Under Review'?(review?['Approved','Revision Required']:[]):[];
}
export function installBoardDrag({root=document,find,targets,onMove,onError}){
 let dragged=null;
 const clear=()=>{dragged=null;root.querySelectorAll('.dragging,.drop-allowed,.drag-over').forEach(el=>el.classList.remove('dragging','drop-allowed','drag-over'));};
 root.addEventListener('dragstart',event=>{
  const card=event.target.closest('.workflow-card[draggable="true"]');if(!card)return;
  const assessment=find(card.dataset.id),allowed=assessment?targets(assessment):[];
  if(!allowed.length){event.preventDefault();return;}
  dragged=assessment.id;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',dragged);card.classList.add('dragging');
  root.querySelectorAll('[data-drop-status]').forEach(column=>column.classList.toggle('drop-allowed',allowed.includes(column.dataset.dropStatus)));
 });
 root.addEventListener('dragover',event=>{
  const column=event.target.closest('[data-drop-status]'),assessment=dragged&&find(dragged);
  if(column&&assessment&&targets(assessment).includes(column.dataset.dropStatus)){event.preventDefault();event.dataTransfer.dropEffect='move';root.querySelectorAll('.drag-over').forEach(el=>el.classList.remove('drag-over'));column.classList.add('drag-over');}
 });
 root.addEventListener('dragleave',event=>{const column=event.target.closest('[data-drop-status]');if(column&&!column.contains(event.relatedTarget))column.classList.remove('drag-over');});
 root.addEventListener('drop',event=>{
  const column=event.target.closest('[data-drop-status]'),id=dragged,assessment=id&&find(id);if(!column||!assessment)return;
  event.preventDefault();const status=column.dataset.dropStatus,allowed=targets(assessment).includes(status);clear();
  if(!allowed){onError('Move this assessment through its next workflow stage.');return;}
  Promise.resolve(onMove(id,status)).catch(error=>onError(error.message));
 });
 root.addEventListener('dragend',clear);
}
