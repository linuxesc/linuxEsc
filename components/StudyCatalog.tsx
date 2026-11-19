'use client';
import {useState} from 'react';

const tracks = [
 {name:'Linux & shell', topics:'Navigation, permissions, services, logs, shell scripting', exercise:'Diagnose an unhealthy service. Check its status, inspect the logs, and verify recovery.', route:'missions', action:'Open Linux missions'},
 {name:'Networking & CCNA', topics:'IP addressing, switching, VLANs, routing, connectivity', exercise:'Trace a failed ping to the switch, repair the VLAN assignment, and retest from the client.', route:'infrastructure', action:'Open network labs'},
 {name:'Containers & Kubernetes', topics:'Docker, Podman, images, Kubernetes, Helm', exercise:'Compare a healthy workload with a failed one. Identify which layer failed before making a change.', route:'infrastructure', action:'Open infrastructure labs'},
 {name:'Automation & delivery', topics:'Ansible, Git, CI/CD, Terraform, GitOps', exercise:'Plan a small rollout with a validation step and write down how you would undo it.', route:'infrastructure', action:'Open Ansible labs'},
 {name:'Cloud engineering', topics:'AWS, Azure, GCP, identity, networking, provisioning', exercise:'Sketch a private application network and explain how it receives traffic and how you would monitor it.'},
 {name:'Observability & reliability', topics:'Metrics, logs, alerting, SRE, incident response', exercise:'Read a postmortem, identify the earliest useful signal, and propose a check that would catch it sooner.', route:'incidents', action:'Open incident library'},
 {name:'Programming for DevOps', topics:'Python, Go, shell scripting, tooling', exercise:'Write a small tool that reads a service health report and summarizes failing checks.'},
 {name:'AI engineering', topics:'Model APIs, evaluation, RAG, MCP, agent tooling', exercise:'Define how you would measure whether a documentation assistant answers correctly and cites the right source.'},
 {name:'Security & certification prep', topics:'Least privilege, exam objectives, certification roadmaps', exercise:'Pick a published exam objective, map it to an existing task, and record what you can demonstrate without hints.', route:'interview', action:'Open interview practice'},
];
export default function StudyCatalog({navigate}:{navigate:(page:string)=>void}){
 const [query,setQuery]=useState('');
 const results=tracks.filter(track=>(track.name+' '+track.topics).toLowerCase().includes(query.trim().toLowerCase()));
 return <section className="home-skills" aria-labelledby="study-catalog-heading">
  <div className="section-title"><div><h2 id="study-catalog-heading">Skills catalog</h2><p>Find an InfraQuest lab or an independent practice idea.</p></div>
   <label>Find a topic <input type="search" className="study-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try Terraform or Kubernetes"/></label>
  </div>
  {results.length===0&&<p>No matching topics.</p>}
  <div className="home-skill-grid">{results.map(track=><article key={track.name} className="panel home-skill-card">
   <h3>{track.name}</h3><span>{track.topics}</span><p>{track.exercise}</p>
   {track.route&&<button className="text-button accent" onClick={()=>navigate(track.route!)}>{track.action}</button>}
  </article>)}</div>
  <p className="study-sources">Browse the original catalogs for courses and labs by <a href="https://kodekloud.com/courses" target="_blank" rel="noreferrer">KodeKloud</a> and <a href="https://www.escbash.com/" target="_blank" rel="noreferrer">escbash</a>.</p>
 </section>;
}
