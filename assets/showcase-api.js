// Public GitHub Pages adapter. Synthetic read-only records only; no login,
// client uploads, stored credentials, server secrets or private API requests.
let snapshot;
async function data(){if(!snapshot){const source=document.querySelector('meta[name=epc-showcase-data]')?.content||new URL('../showcase-data.json',import.meta.url);const response=await fetch(source);if(!response.ok)throw new Error('Sample data is unavailable');snapshot=await response.json();}return snapshot;}
export async function showcaseApi(path,options={}){
  const method=options.method||'GET';if(method!=='GET')throw new Error('Read-only public demonstration. Client imports and updates belong in the private AWS workspace.');
  const d=await data();
  if(path==='/config')return{demo:true,staticDemo:true,issuance:false,initialized:true,references:{},zones:[],privacyContact:null};
  if(path==='/me')return{user:{id:'public-viewer',tenant:'synthetic-showcase',name:'Portfolio viewer',email:'Sample data only',role:'Property Owner'},csrf:null};
  if(path==='/portfolio')return structuredClone(d);
  if(path==='/audit')return[];
  throw new Error('This action is available in the private application. The public demo contains sample data only.');
}
