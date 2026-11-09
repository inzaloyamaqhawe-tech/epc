// Apply the saved Bolide appearance before stylesheet paint (also on Pages).
try{
  const stored=localStorage.getItem('epc-theme-disabled')==='true'?'light':localStorage.getItem('bolide-epc:theme')||localStorage.getItem('epc-theme');
  const theme=stored==='dark'?'dark':'light';
  document.documentElement.dataset.theme=theme;
  document.documentElement.classList.toggle('dark',theme==='dark');
}catch{}
