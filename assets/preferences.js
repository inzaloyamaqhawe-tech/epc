import {icon} from '/components/primitives.js';

// Same per-product preference convention as bolide-crm:* and bolide-prospector:*.
export function readPreferences(){
  let theme='light',compactNav=false;
  try{
    if(localStorage.getItem('epc-theme-disabled')!=='true')theme=localStorage.getItem('bolide-epc:theme')||localStorage.getItem('epc-theme')||'light';
    compactNav=localStorage.getItem('bolide-epc:compact-nav')==='1';
  }catch{}
  return{theme:theme==='dark'?'dark':'light',compactNav};
}

export function applyTheme(value,persist=true){
  const theme=value==='dark'?'dark':'light';
  document.documentElement.dataset.theme=theme;
  document.documentElement.classList.toggle('dark',theme==='dark');
  document.querySelector('meta[name=theme-color]')?.setAttribute('content',theme==='dark'?'#21171d':'#fffbf8');
  if(persist)try{if(localStorage.getItem('epc-theme-disabled')!=='true'){localStorage.setItem('bolide-epc:theme',theme);localStorage.removeItem('epc-theme');}}catch{}
  return theme;
}

export function syncWorkspaceControls({theme,compactNav}){
  const desktop=document.querySelector('[data-action=collapse]');
  if(desktop){
    const label=compactNav?'Show menu names':'Hide menu names';
    desktop.innerHTML=icon(compactNav?'panelOpen':'panelClose');
    desktop.title=label;desktop.setAttribute('aria-label',label);
    desktop.setAttribute('aria-expanded',String(!compactNav));
  }
  for(const button of document.querySelectorAll('[data-action=theme]')){
    const dark=theme==='dark',label=dark?'Use light mode':'Use dark mode';
    button.innerHTML=icon(dark?'sun':'moon');button.title=label;
    button.setAttribute('aria-label',label);button.setAttribute('aria-pressed',String(dark));
  }
}
