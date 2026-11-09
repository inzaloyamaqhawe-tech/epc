// Navigation follows CRM/Prospector's lg breakpoint; content layout has its
// own tablet/phone rules. There must be no width with neither menu control.
const navigationQuery='(max-width: 1023px)';
export function syncNavigationState(){
  const narrow=matchMedia(navigationQuery).matches;
  const open=narrow&&document.body.classList.contains('menu-open');
  const sidebar=document.querySelector('#epc-sidebar');
  if(sidebar){sidebar.inert=narrow&&!open;sidebar.setAttribute('aria-hidden',String(narrow&&!open));}
  document.querySelector('.mobile-menu')?.setAttribute('aria-expanded',String(open));
}
export function responsiveNavigation() {
  const media=matchMedia(navigationQuery);
  document.addEventListener('click',event=>{
    if(media.matches&&event.target.closest('#epc-sidebar a[href^="#"]')){
      document.body.classList.remove('menu-open');syncNavigationState();
    }
  });
  const sync=()=>{document.body.classList.toggle('compact',media.matches);if(!media.matches)document.body.classList.remove('menu-open');syncNavigationState();};
  media.addEventListener('change',sync);sync();
}
