import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { fileURLToPath } from 'node:url';
import { calculate, certificateStatus } from './scoringEngine.js';
import { BANDS } from './benchmarkMatrix.js';
export async function assessmentPdf(a, c, origin) {
  const pdf = new PDFDocument({size:'A4', margin:42, info:{Title:`Bolide EPC review pack ${c?.internal || a.name}`,Author:'Bolide Energy Pro'}});
  const buffers=[]; pdf.on('data',b=>buffers.push(b));
  const finished=new Promise((yes,no)=>{pdf.on('end',()=>yes(Buffer.concat(buffers)));pdf.on('error',no);});
  const result=calculate(a);
  pdf.image(fileURLToPath(new URL('../assets/bolide-logo.png',import.meta.url)),42,32,{fit:[140,45]});
  pdf.fillColor('#a82560').fontSize(10).text('ENGINEERING REVIEW PACK',320,44,{width:230,align:'right'});
  pdf.moveDown(3); pdf.fillColor('#2a1c24').fontSize(26).text('Energy performance assessment',42,100);
  pdf.fontSize(11).fillColor('#6e5f67').text('PREVIEW — NOT AN OFFICIAL ENERGY PERFORMANCE CERTIFICATE');
  pdf.moveDown(); pdf.fillColor('#2a1c24').fontSize(18).text(a.name); pdf.fontSize(10).text(a.address);
  const rows=[['Property ID',a.propertyId||a.id],['Internal tracking',c?.internal||'Pending approval'],['SANEDI NBEPR number',c?.sanedi||'Not assigned'],['Record status',c?certificateStatus(c):a.status],['Occupancy / energy zone',`${a.occupancy} / Zone ${a.zone}`],['Net / gross floor area',`${Number(a.nfa).toFixed(2)} / ${Number(a.gfa).toFixed(2)} m²`],['Vacancy-adjusted area',`${result.assessedArea.toFixed(2)} m²`],['Reporting period',`${a.months?.[0]?.month} to ${a.months?.at(-1)?.month}`],['Included annual consumption',`${result.net.toFixed(2)} kWh`],['Energy use intensity',`${result.eui.toFixed(2)} kWh/m²/year`],['Reference Er',`${a.benchmark||'Unverified'} kWh/m²/year`],['Reference source',a.benchmarkSource||'Not supplied'],['Issue / expiry',c?.issued?`${c.issued} / ${c.expires}`:'Not issued']];
  pdf.moveDown();
  for(const [label,value] of rows){const y=pdf.y; pdf.font('Helvetica-Bold').text(label,42,y,{width:160}); pdf.font('Helvetica').text(String(value),210,y,{width:340});pdf.y=Math.max(pdf.y,y+15)+4;}
  pdf.moveDown(); const y=pdf.y;
  BANDS.forEach(([letter,,color],i)=>{pdf.rect(42+i*72,y,68,35).fill(color);pdf.fillColor('#ffffff').fontSize(14).text(letter,42+i*72,y+10,{width:68,align:'center'});});
  pdf.y=y+48;pdf.fillColor('#2a1c24').fontSize(12).text(`Calculated rating: ${result.grade||'Pending verified benchmark'}${result.provisional?' (provisional)':''}`,42,pdf.y);
  pdf.fontSize(10).text(`Excluded energy: ${result.excluded.toFixed(2)} kWh (${result.excludedPercent.toFixed(1)}% of total). Exclusions are recorded separately in the monthly ledger.`);
  if(result.excludedPercent>10) pdf.fillColor('#a82560').text('ATTENTION: excluded energy exceeds the project review trigger of 10%.');
  pdf.fillColor('#6e5f67').fontSize(9).text('A–G bands use the configured project methodology. This pack does not replace the certificate issued by a registered EPC professional. Confirm the licensed standards, reference values, conversion factors and approved certificate format before external use.');
  pdf.addPage();pdf.fillColor('#2a1c24').fontSize(20).text('Evidence and energy ledger');pdf.moveDown();pdf.fontSize(9);
  const columns=[['Month','month',55],['Grid kWh','grid',65],['Solar kWh','solar',65],['Export kWh','export',65],['Diesel L','diesel',45],['LPG kg','lpg',45],['Other kWh','other',65],['Excluded kWh','excluded',85]];
  function ledgerRow(values){const y=pdf.y;let x=42;for(const [label,key,width]of columns){pdf.text(String(values[key]),x,y,{width:width-5,lineBreak:false});x+=width;}pdf.x=42;pdf.y=y+15;}
  ledgerRow(Object.fromEntries(columns.map(([label,key])=>[key,label])));
  for(const m of a.months||[])ledgerRow(Object.fromEntries(columns.map(([,key])=>[key,key==='month'?m[key]:Number(m[key]||0).toLocaleString('en-ZA',{maximumFractionDigits:2}).replaceAll('\u00a0',' ')])));
  pdf.moveDown();pdf.text(`Diesel factor: ${a.dieselFactor} kWh/L. LPG factor: ${a.lpgFactor} kWh/kg. Basis: ${a.factorSource||'Not supplied'}`);
  pdf.moveDown(); for(const s of a.systems||[]) {pdf.font('Helvetica-Bold').text(`${s.code} ${s.title}: ${s.status}`);pdf.font('Helvetica').text(s.notes||'No evidence note');pdf.moveDown(.5);}
  pdf.moveDown();pdf.text(`Site audit: ${a.auditDate||'Pending'} | ${a.auditBody||'Pending'} | ${a.auditReference||'Pending'}`);
  pdf.text(`Professional: ${a.professional||'Pending'} | Registration: ${a.professionalNumber||'Pending'}`);
  if(c){const qr=await QRCode.toBuffer(`${origin}/verify/${c.publicToken}`,{width:180,margin:1}); if(pdf.y>660)pdf.addPage();pdf.moveDown();const qy=pdf.y;pdf.image(qr,42,qy,{width:90});pdf.text(`Public record verification\n${c.internal}\n${c.sanedi||'SANEDI number pending'}\nThis QR verifies the platform record only.`,150,qy+10,{width:370});}
  pdf.end();return finished;
}
