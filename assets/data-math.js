/* Pure transformations shared by the dashboard and offline tests. */
(function(root){
'use strict';
const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
function aggregate(rows,field='value',period='month',method='mean'){
 const groups=new Map();
 rows.forEach(r=>{if(!Number.isFinite(r[field]))return;const key=r.date.slice(0,period==='year'?4:7);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r)});
 return [...groups].sort(([a],[b])=>a.localeCompare(b)).map(([date,rs])=>{
  rs.sort((a,b)=>a.date.localeCompare(b.date));
  return {date,value:method==='last'?rs.at(-1)[field]:mean(rs.map(r=>r[field])),count:rs.length,last_date:rs.at(-1).date};
 });
}
function join(series){
 if(!series.length)return [];
 const maps=series.map(rs=>new Map(rs.map(r=>[r.date,r.value])));
 return [...maps[0].keys()].filter(d=>maps.every(m=>Number.isFinite(m.get(d)))).sort().map(date=>({date,values:maps.map(m=>m.get(date))}));
}
function cracks(brent,gasoline,diesel){
 return join([brent,gasoline,diesel]).map(({date,values:[b,g,d]})=>({date,brent:b,gasoline:g*42,diesel:d*42,gasoline_crack:g*42-b,diesel_crack:d*42-b,crack321:(2*g+d)*42/3-b}));
}
function rolling(rows,field='value',days=7){
 const map=new Map(rows.map(r=>[r.date,r[field]]));
 return rows.map(r=>{
  const values=[];let date=new Date(r.date+'T00:00:00Z');
  for(let i=0;i<days;i++){values.push(map.get(date.toISOString().slice(0,10)));date.setUTCDate(date.getUTCDate()-1)}
  return {...r,average:values.every(Number.isFinite)?mean(values):null};
 });
}
function calendar(rows){
 if(!rows.length)return [];
 const map=new Map(rows.map(r=>[r.date,r]));const out=[];
 for(let date=new Date(rows[0].date+'T00:00:00Z');date.toISOString().slice(0,10)<=rows.at(-1).date;date.setUTCDate(date.getUTCDate()+1)){
  const key=date.toISOString().slice(0,10);out.push(map.get(key)||{date:key,tanker:null,total:null,average:null});
 }
 return out;
}
function signal(value,low,high){return !Number.isFinite(value)?'missing':value<low?'low':value>=high?'high':'middle'}
const api={mean,aggregate,join,cracks,rolling,calendar,signal};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SectorMath=api;
})(typeof window!=='undefined'?window:globalThis);
