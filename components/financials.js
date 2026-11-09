// End-of-year nominal cash flows. No financing, tax, residual value or carbon revenue.
export function financialScenario(initiative,assumptions={}){
 const take=(key,fallback,min,max)=>{const value=Number(assumptions[key]??fallback);if(!Number.isFinite(value)||value<min||value>max)throw new Error(`Invalid ${key}`);return value;};
 const years=take('years',10,1,40);if(!Number.isInteger(years))throw new Error('Years must be a whole number');
 const discount=take('discount',10,0,50)/100,escalation=take('escalation',6,0,30)/100,maintenance=take('maintenance',0,0,1e12),carbonPrice=take('carbonPrice',0,0,1e6);
 const kwh=Number(initiative.kwh),tariff=Number(initiative.tariff),cost=Number(initiative.cost),emission=Number(initiative.emission);
 if([kwh,tariff,cost,emission].some(x=>!Number.isFinite(x)||x<0||x>1e12))throw new Error('Invalid initiative inputs');
 const annual=kwh*tariff,flows=[-cost];for(let year=1;year<=years;year++)flows.push(annual*(1+escalation)**(year-1)-maintenance);
 const npvAt=rate=>flows.reduce((sum,flow,year)=>sum+flow/(1+rate)**year,0);
 let irr=null;if(cost>0&&flows.slice(1).some(x=>x>0)){let low=-.9999,high=1;while(npvAt(high)>0&&high<1e6)high*=2;if(npvAt(low)>0&&npvAt(high)<0){for(let i=0;i<150;i++){const mid=(low+high)/2;if(npvAt(mid)>0)low=mid;else high=mid;}irr=(low+high)/2*100;}}
 const recover=discounted=>{if(cost===0)return 0;let cumulative=-cost;for(let year=1;year<=years;year++){const flow=flows[year]/(discounted?(1+discount)**year:1);if(cumulative<0&&cumulative+flow>=0)return year-1-cumulative/flow;cumulative+=flow;}return null;};
 return{npv:npvAt(discount),irr,escalatingPayback:recover(false),discountedPayback:recover(true),carbonValue:kwh*emission/1000*carbonPrice,flows,years,discount:discount*100,escalation:escalation*100,maintenance,carbonPrice};
}
export function filteredInitiatives(data,filters={}){return data.initiatives.filter(i=>{const a=data.assessments.find(a=>a.id===i.assessmentId);return(!filters.province||a?.province===filters.province)&&(!filters.rating||a?.result?.grade===filters.rating)&&(!filters.status||i.status===filters.status);});}
