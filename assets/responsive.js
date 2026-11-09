// Adapted from the adjacent prospector use-mobile hook: one 768px breakpoint,
// matchMedia change events, with native DOM rather than a React dependency.
export function responsiveNavigation() {
  const media=matchMedia('(max-width: 767px)');
  const sync=()=>{document.body.classList.toggle('compact',media.matches);if(!media.matches)document.body.classList.remove('menu-open');};
  media.addEventListener('change',sync);sync();
}
