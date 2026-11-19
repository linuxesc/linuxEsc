'use client';
import {useEffect,useState} from 'react';
import historical from '@/data/incidents.json';

type Report = {
 id:string;title:string;source:string;url:string;category:string;technology:string;
 published:string;status:string;incidentStatus:string;summary:string;discovered?:string;
 verified?:string;difficulty?:string;affected?:string;symptoms?:string;errors?:string;logs?:string;
 topology?:string;hypotheses?:string;investigation?:string;commands?:string;cause?:string;
 solution?:string;alternatives?:string;rollback?:string;prevention?:string;lab?:string;evidence?:string;related?:string[];
};
const categories=['Linux System Administration','CCNA and Network Engineering','Ansible','Podman','Kubernetes','Data Center Engineering','Production DevOps'];
const statusOptions=['Verified solution','Community-reported solution','Proposed fix','Unresolved','Outdated or version-specific'];
const periods=['All dates','Today','Last 7 Days','Last 30 Days','Historical'];
const fields=[['Affected systems and versions','affected'],['Symptoms','symptoms'],['Error messages','errors'],['Relevant logs','logs'],['Topology','topology'],['Possible causes','hypotheses'],['Investigation steps','investigation'],['Diagnostic commands','commands'],['Confirmed root cause','cause'],['Documented solution','solution'],['Alternatives','alternatives'],['Rollback and recovery','rollback'],['Prevention','prevention'],['Verification basis','evidence']] as const;
const labels=(row:Report)=>Object.values(row).flat().join(' ').toLowerCase();
export default function Incidents({startCooling}:{startCooling:()=>void}){
 const [reports,setReports]=useState<Report[]>([]),[lastSync,setLastSync]=useState<string|null>(null);
 const [offline,setOffline]=useState(false),[query,setQuery]=useState(''),[category,setCategory]=useState(''),[status,setStatus]=useState(''),[period,setPeriod]=useState('All dates');
 const [selected,setSelected]=useState<string|null>(null);
 useEffect(()=>{
  const api=process.env.NEXT_PUBLIC_INCIDENTS_API;
  const publicFeed="https://status.cloud.google.com/incidents.json";
  const controller=new AbortController();
  async function refresh(){
   try{
    const response=await fetch(api?api.replace(/\/$/,'')+'/incidents':publicFeed,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)]),cache:'no-store'});
    if(!response.ok)throw new Error('Feed unavailable');
    const payload=await response.json();
    const now=new Date().toISOString();
    const data=api?payload:{
     lastSuccessfulSync:now,
     reports:(Array.isArray(payload)?payload:[]).filter(row=>typeof row?.id==='string'&&/^[A-Za-z0-9_-]{5,80}$/.test(row.id)&&typeof row.created==='string'&&Number.isFinite(Date.parse(row.created))).map(row=>({
      id:'gcp-'+row.id,title:'Google Cloud service disruption',source:'Google Cloud Service Health',
      url:'https://status.cloud.google.com/incidents/'+row.id,published:row.created,discovered:now,
      technology:'Google Cloud',category:'Production DevOps',incidentStatus:row.end?'Resolved per source':'Open per source',
      status:'Unresolved',summary:'Discovered from the public status feed. Technical resolution awaits review.',
     })),
    };
    if(!Array.isArray(data.reports)||(!api&&!data.reports.length))throw new Error('Unexpected feed format');
    if(!controller.signal.aborted){
     setReports(old=>{
      const previous=new Map(old.map(row=>[row.id,row.discovered]));
      return (data.reports as Report[]).filter(row=>!historical.some(seed=>seed.url===row.url))
       .map(row=>({...row,discovered:previous.get(row.id)??row.discovered}));
     });setLastSync(data.lastSuccessfulSync);setOffline(false);
    }
   }catch{if(!controller.signal.aborted)setOffline(true);}
  }
  void refresh();
  const interval=setInterval(refresh,300000);
  return ()=>{controller.abort();clearInterval(interval);};
 },[]);
 const rows=[...historical,...reports] as Report[];
 const today=new Date();today.setHours(0,0,0,0);
 const cutoff=Date.now()-86400000*(period==='Last 7 Days'?7:30);
 const results=rows.filter(row=>{
  const stamp=Date.parse(row.published);
  return (!category||row.category===category)&&(!status||row.status===status)&&
   (period==='All dates'||(period==='Today'?stamp>=+today:period==='Historical'?stamp<cutoff:stamp>=cutoff))&&
   (row.id===selected||query.toLowerCase().trim().split(/\s+/).every(term=>labels(row).includes(term)));
 }).sort((a,b)=>Date.parse(b.published)-Date.parse(a.published));
 const fresh=lastSync&&Date.now()-Date.parse(lastSync)<2*3600000&&!offline;
 return <section className="infra">
  <header><h1>Live Infrastructure Issues</h1><p>Reviewed historical cases and reports from the Google Cloud public status feed.</p></header>
  <div className="panel infra-brief"><p role="status">{lastSync?'Last successful synchronization '+new Date(lastSync).toLocaleString(): 'No successful feed synchronization recorded.'} {fresh?(process.env.NEXT_PUBLIC_INCIDENTS_API?'Scheduled feed current.':'Public feed refreshed in this browser.'):offline?'Feed unavailable.':'Showing historical or cached data.'}</p></div>
  <div className="infra-toolbar">
   <label>Search incidents<input type="search" placeholder="Error, command, technology, or version" value={query} onChange={e=>{setSelected(null);setQuery(e.target.value);}}/></label>
   <label>Library<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">All categories</option>{categories.map(x=><option key={x}>{x}</option>)}</select></label>
   <label>Resolution<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All resolution statuses</option>{statusOptions.map(x=><option key={x}>{x}</option>)}</select></label>
   <label>Report date<select value={period} onChange={e=>setPeriod(e.target.value)}>{periods.map(x=><option key={x}>{x}</option>)}</select></label>
  </div>
  <p>{results.length} matching reports</p>
  {results.map(row=><article key={row.id} className="panel infra-brief">
   <h2>{row.title}</h2><p>{row.technology} · {row.difficulty??'Difficulty pending review'} · {row.incidentStatus} · {row.status}</p>
   <p>{row.source} · Reported <time dateTime={row.published}>{row.published}</time> · {row.discovered?'Discovered '+new Date(row.discovered).toLocaleString():'Curated case'}</p>
   <p>{row.summary}</p><p>{row.affected??'Affected versions unknown.'}</p>
   {row.verified&&<p>Source verified <time dateTime={row.verified}>{row.verified}</time></p>}
   <p><a className="text-button accent" href={row.url} target="_blank" rel="noreferrer">Original report</a></p>
   <details open={row.id===selected||undefined}><summary>Investigation and resolution</summary><dl>{fields.map(([label,key])=><div key={key} style={{margin:'10px 0'}}><dt><strong>{label}</strong></dt><dd>{row[key]??'Not documented or pending review.'}</dd></div>)}</dl></details>
   {row.related?.map(id=>{const related=rows.find(item=>item.id===id);return related&&<button key={id} className="text-button" onClick={()=>{setSelected(id);setCategory('');setStatus('');setPeriod('All dates');setQuery(related.title);}}>Related: {related.title}</button>;})}
   {row.lab==='cooling'&&<p><button className="primary-button" onClick={startCooling}>Play cooling incident</button></p>}
  </article>)}
 </section>;
}
