'use client';

import cases from '@/data/incidents.json';
import {useEffect,useRef,useState} from 'react';
import {catalog,paths,levels,kinds,scenario,makeDevice,linkUp,route,solved,command,deviceCommand,consolePrompt,reachableServers,type ConsoleMode,type Lab,type Infra,type Device,type Link,type Kind} from '@/lib/infrastructure';

type Scores=Partial<Record<Lab,number>>;
export default function Infrastructure({openLinux,practiceUntil,startPracticeHour,startCooling,clearLaunch}:{startCooling:boolean;clearLaunch:()=>void;openLinux:()=>void;practiceUntil:number;startPracticeHour:()=>void}){
 const [world,setWorld]=useState<Infra>(()=>scenario('free'));
 const [lab,setLab]=useState<Lab>('free'),[view,setView]=useState('Topology'),[career,setCareer]=useState(0);
 const [selected,select]=useState('sw1'),[port,setPort]=useState(0),[kind,setKind]=useState<Kind>('Server');
 const [target,setTarget]=useState(''),[media,setMedia]=useState<Link['media']>('Ethernet');
 const [line,setLine]=useState(''),[output,setOutput]=useState('Type help for supported commands.'),[packet,setPacket]=useState<string[]>([]);
 const [scores,setScores]=useState<Scores>({}),[started,setStarted]=useState(0),[seconds,setSeconds]=useState(0);
 const [guided,setGuided]=useState(true),[timed,setTimed]=useState(false),[debrief,setDebrief]=useState(false);
 const [incidentMode,setIncidentMode]=useState('Learning');
 const [hintStep,setHintStep]=useState(0);
 const [consoleMode,setConsoleMode]=useState<ConsoleMode>('user');
 const [transcript,setTranscript]=useState<{prompt:string;input:string;output:string}[]>([]);
 const [historyIndex,setHistoryIndex]=useState<number|null>(null);
 const draft=useRef('');
 const consoleLog=useRef<HTMLDivElement>(null);
 useEffect(()=>{const log=consoleLog.current;if(log)log.scrollTop=log.scrollHeight;},[transcript,output]);
 const [tool,setTool]=useState('Connections');
 const [fiberCheck,setFiberCheck]=useState('');
 const [wiring,setWiring]=useState(false);
 const [wireFrom,setWireFrom]=useState('');
 const [wireTo,setWireTo]=useState('');
 const [wirePorts,setWirePorts]=useState({a:'',b:''});
 const [wireMessage,setWireMessage]=useState('');
 const consoleInput=useRef<HTMLInputElement>(null);
 const toolsPanel=useRef<HTMLElement>(null);
 const [focusConsole,setFocusConsole]=useState(false);
 useEffect(()=>{
  if(!focusConsole)return;
  toolsPanel.current?.scrollIntoView({block:'start'});
  consoleInput.current?.focus({preventScroll:true});
  setFocusConsole(false);
 },[focusConsole]);
 const [drag,setDrag]=useState<string|null>(null);
 const mission=catalog.find(m=>m.id===lab);
 const device=world.devices.find(d=>d.id===selected)??world.devices[0];
 const complete=solved(world,lab);
 const xp=Object.keys(scores).length*150;
 useEffect(()=>{try{setScores(JSON.parse(localStorage.getItem('infraquest-completions')??'{}'));setCareer(Number(localStorage.getItem('infraquest-career')??0));}catch{}},[]);
 useEffect(()=>{if(!started||complete)return;const timer=setInterval(()=>setSeconds(Math.floor((Date.now()-started)/1000)),1000);return()=>clearInterval(timer);},[started,complete]);
 useEffect(()=>{if(!complete||lab==='free')return;const elapsed=Math.floor((Date.now()-started)/1000);setScores(old=>{if(old[lab]!==undefined&&old[lab]!<=elapsed)return old;const next={...old,[lab]:elapsed};try{localStorage.setItem('infraquest-completions',JSON.stringify(next));}catch{}return next});},[complete,lab,started]);
 function start(id:Lab){
  cancelWire();setConsoleMode('user');setTranscript([]);setHistoryIndex(null);setLine('');draft.current='';setTool(id==='install'||id==='free'?'Equipment':'Connections');setFiberCheck('');setHintStep(0);setWorld(scenario(id));setLab(id);setStarted(Date.now());setSeconds(0);select('sw1');setPort(0);setPacket([]);setDebrief(false);setTarget('');setOutput('Environment ready. Type help for commands.');
 }
 useEffect(()=>{if(startCooling){start('cooling');setCareer(5);clearLaunch();}},[startCooling,clearLaunch]);
 function choose(id:string){select(id);setPort(0);setConsoleMode('user');}
 function patch(change:Partial<Device>){setWorld(old=>({...old,devices:old.devices.map(d=>d.id===device.id?{...d,...change}:d)}));setPacket([]);}
 function add(){
  const index=world.devices.length;
  const unit=Array.from({length:42},(_,i)=>i+1).find(u=>!world.devices.some(d=>d.room==='Compute'&&d.rack===2&&d.unit===u));
  if(!unit){setOutput('Compute rack has no free units.');return;}
  const next=makeDevice(kind.toLowerCase()+'-'+crypto.randomUUID().slice(0,8),kind,index);
  next.room='Compute';next.rack=2;next.unit=unit;setWorld({...world,devices:[...world.devices,next]});choose(next.id);
 }
 function cancelWire(){
  setWiring(false);setWireFrom('');setWireTo('');setWirePorts({a:'',b:''});setWireMessage('');
 }
 function openConsole(id:string){
  if(selected!==id)choose(id);
  setTool('Console');setFocusConsole(true);
 }
 function chooseOnMap(id:string){
  if(!wiring){if(selected!==id)choose(id);return;}
  if(!wireFrom){setWireFrom(id);return;}
  if(id!==wireFrom){setWireTo(id);setWirePorts({a:'',b:''});setWireMessage('');}
 }
 function portInUse(id:string,port:number){
  return world.links.some(link=>(link.a===id&&link.ap===port)||(link.b===id&&link.bp===port));
 }
 function connectOnMap(){
  if(!wireFrom||!wireTo||wirePorts.a===''||wirePorts.b==='')return;
  const ap=Number(wirePorts.a),bp=Number(wirePorts.b);
  if(portInUse(wireFrom,ap)||portInUse(wireTo,bp)){setWireMessage('A selected port is already occupied.');return;}
  const link:Link={a:wireFrom,ap,b:wireTo,bp,media,connected:true};
  setWorld(previous=>({...previous,links:[...previous.links,link],events:[...previous.events,wireFrom+' e'+(ap+1)+' cabled to '+wireTo+' e'+(bp+1)]}));
  setPacket([]);cancelWire();choose(wireFrom);setTool('Connections');
  setWireMessage(wireFrom+' e'+(ap+1)+' connected to '+wireTo+' e'+(bp+1)+'.');
 }
 function cable(){
  const other=world.devices.find(d=>d.id===target);
  if(!other||other.id===device.id)return;
  const available=(d:Device)=>d.ports.findIndex((_,i)=>!world.links.some(l=>(l.a===d.id&&l.ap===i)||(l.b===d.id&&l.bp===i)));
  const ap=available(device),bp=available(other);
  if(ap<0||bp<0){setOutput('No unused port on one endpoint.');return;}
  setWorld({...world,links:[...world.links,{a:device.id,ap,b:other.id,bp,media,connected:true}],events:[...world.events,device.id+' cabled to '+other.id]});
 }
 function execute(input:string){
  if(!input.trim())return;
  setHistoryIndex(null);draft.current='';
  if(input.trim()==='clear'){setTranscript([]);setOutput('');setLine('');return;}
  const next=structuredClone(world),result=deviceCommand(next,device,input,port,consoleMode);
  setConsoleMode(result.mode);
  setTranscript(entries=>[...entries.slice(-199),{prompt:consolePrompt(device,consoleMode,port),input,output:result.output}]);
  setWorld(next);setPort(result.port);setOutput(result.output);setPacket(result.packet??[]);setLine('');
 }
 function toggleCable(link:Link){
  setPacket([]);setFiberCheck('');
  setWorld(previous=>({...previous,links:previous.links.map(item=>item===link?{...item,connected:!item.connected}:item),
   events:[...previous.events,link.a+' ↔ '+link.b+(link.connected?' disconnected':' reconnected')]}));
 }
 const fiber=world.links.find(link=>link.media==='Fiber'&&[link.a,link.b].includes('san1')&&[link.a,link.b].includes('sw1'));
 const height=Math.max(300,...world.devices.map(d=>d.y+75));
 const stable=!!route(world,'pc1','srv1').length;
 return <section className="infra">
  <header><div className="accent eyebrow">INFRAQUEST · CAREER MODE</div><h1>Infrastructure Control Center</h1><p>Operate the topology, hosts and racks from a shared simulation.</p></header>
  <details className="panel infra-brief" open={!mission}><summary>{mission?"Change mission or practice settings":"Choose a career path and mission"}</summary><div className="infra-toolbar">
   <label>Career path <select value={career} onChange={e=>{const n=Number(e.target.value);setCareer(n);try{localStorage.setItem('infraquest-career',String(n));}catch{}}}>{paths.map((p,i)=><option key={p} value={i}>{p}</option>)}</select></label>
   <label><input type="checkbox" checked={guided} onChange={e=>setGuided(e.target.checked)}/> Guided</label>
   <label><input type="checkbox" checked={timed} onChange={e=>setTimed(e.target.checked)}/> Timed</label>
   <button className="secondary-button" onClick={startPracticeHour}>{practiceUntil>Date.now()?'All missions unlocked until '+new Date(practiceUntil).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})+' · Restart hour':'Unlock all missions for 1 hour'}</button><span>{xp} infrastructure XP · {Object.keys(scores).length}/{catalog.length} missions</span>{xp>0&&<span className="tag tag-green">First infrastructure recovery</span>}
  </div>
  {career===0?<p><button onClick={openLinux} className="primary-button">Open Linux missions</button></p>:<div className="infra-labs">
   {catalog.filter(m=>m.path===career).map(m=><button className={lab===m.id?'primary-button':'secondary-button'} key={m.id} disabled={m.id!=='cooling'&&practiceUntil<=Date.now()&&m.level>0&&catalog.some(prior=>prior.path===m.path&&prior.level<m.level)&&!catalog.some(prior=>prior.path===m.path&&prior.level===m.level-1&&scores[prior.id]!==undefined)} onClick={()=>start(m.id)}>{scores[m.id]!==undefined?'✓ ':''}{m.title} · {levels[m.level]}</button>)}
  </div>}</details>
  <div className="panel infra-brief"><span className="eyebrow accent">{mission?"CURRENT MISSION":"SANDBOX"}</span><h2>{mission?.title??'Free practice'}</h2>
   <p>{mission?.brief??'Build a topology, configure endpoints and inspect how device changes affect your services.'}</p>
   {lab==='fiber'&&fiber&&<ol className="infra-steps">
    <li><strong>Find the broken link</strong><p>sw1 is the network switch. san1 is the storage system. Their fiber cable is <strong>{linkUp(world,fiber)?'up':'down'}</strong>.</p></li>
    <li><strong>Reconnect the existing cable</strong><p>{fiber.connected?'The cable is seated. If the link is still down, inspect both devices.':'The cable is disconnected. Reconnect it before checking storage access.'}</p>{!fiber.connected&&<button className="primary-button" onClick={()=>toggleCable(fiber)}>Reconnect storage fiber</button>}</li>
    <li><strong>Verify storage access</strong><p>Send a ping from pc1 to san1. A reply confirms the storage system is reachable.</p><button className="secondary-button" onClick={()=>{const result=command(world,'pc1','ping san1',0);setFiberCheck(result.output);setPacket(result.packet??[]);}}>Test storage connection</button>{fiberCheck&&<p role="status">{fiberCheck}</p>}</li>
   </ol>}
   {lab==='cooling'&&<div className="infra-toolbar"><label>Incident mode<select value={incidentMode} onChange={e=>setIncidentMode(e.target.value)}>{['Learning','Blind Troubleshooting','On-Call Simulation','Interview'].map(mode=><option key={mode}>{mode}</option>)}</select></label><span>Fictional training adaptation</span><a className="text-button accent" href={cases[0].url} target="_blank" rel="noreferrer">Operator postmortem</a></div>}
   {lab==='cooling'&&incidentMode==='Learning'&&<div><button className="secondary-button" disabled={hintStep>=3} onClick={()=>setHintStep(n=>n+1)}>Reveal next evidence hint</button><ol>{[
    'Read show environment and show hardware on srv1. A room alarm plus a powered-off host suggests protective shutdown, but confirm before restarting.',
    'Record isolation with incident isolate srv1. Use incident escalate facilities and incident await-clearance. A restart is blocked until simulated clearance.',
    'Once cleared, power on srv1. Select pc1 and run verify application. Expect HTTP 200 only when the client path is restored.',
   ].slice(0,hintStep).map(h=><li key={h}>{h}</li>)}</ol></div>}
   {lab==='cooling'&&incidentMode==='On-Call Simulation'&&<p>On-call elapsed: {seconds}s. Record isolation and escalation, then verify recovery from pc1.</p>}
   {lab==='cooling'&&incidentMode==='Interview'&&<details><summary>How would you distinguish a cooling incident from a switch outage?</summary><p>{mission?.answer}</p></details>}
   {mission&&lab!=='cooling'&&lab!=='fiber'&&guided&&<details><summary>Guided steps</summary>{mission.hint}</details>}
   {mission&&lab!=='cooling'&&<details><summary>Interview practice</summary><p>How would you diagnose and resolve this incident?</p><p>{mission.answer}</p></details>}
   {mission&&timed&&<p>Elapsed {seconds}s · Suggested target 300s</p>}
   {complete&&<div role="status"><strong className="accent">Mission complete · +150 XP on first completion</strong> <button onClick={()=>setDebrief(!debrief)} className="secondary-button">Debrief</button>{debrief&&<p>{mission?.answer} {lab==='cooling'&&cases[0].solution}</p>}</div>}
   <div className="infra-toolbar"><button className="secondary-button" onClick={()=>start(lab)}>Reset environment</button><button className="secondary-button" onClick={()=>start('free')}>Free practice</button>
    {lab==='free'&&<><button className="secondary-button" onClick={()=>{try{localStorage.setItem('infraquest-topology',JSON.stringify(world));setOutput('Topology saved in this browser.');}catch{setOutput('Browser storage is unavailable.');}}}>Save topology</button><button className="secondary-button" onClick={()=>{try{const value=localStorage.getItem('infraquest-topology');if(value){const saved=JSON.parse(value) as Infra;setWorld(saved);choose(saved.devices[0].id);setTarget('');setPacket([]);setOutput('Saved topology loaded.');}else setOutput('No saved topology.');}catch{setOutput('Unable to load topology.');}}}>Load topology</button></>}
   </div>
  </div>
  <div className="infra-toolbar" aria-label="Infrastructure views">{['Topology','Racks','Operations'].map(v=><button className={v===view?'primary-button':'secondary-button'} key={v} onClick={()=>setView(v)}>{v}</button>)}</div>
  {view==='Topology'&&<div className="panel infra-diagram">
   <div className="infra-toolbar">
    <button className={wiring?'primary-button':'secondary-button'} aria-pressed={wiring} onClick={()=>wiring?cancelWire():(setWireMessage(''),setWiring(true))}>{wiring?'Cancel cabling':'Connect devices'}</button>
    <button className="secondary-button" onClick={()=>openConsole(device.id)}>Open {device.id} console</button>
   </div>
   {wiring&&<div className="infra-toolbar" aria-live="polite">
    <p>{!wireFrom?'Select the first device on the map.':!wireTo?'Select a second device to connect to '+wireFrom+'.':wireFrom+' → '+wireTo}</p>
    {wireTo&&<>{([['a',wireFrom],['b',wireTo]] as const).map(([end,id])=><label key={end}>{id} port
     <select value={wirePorts[end]} onChange={e=>setWirePorts(previous=>({...previous,[end]:e.target.value}))}>
      <option value="">Choose port</option>{world.devices.find(d=>d.id===id)?.ports.map((_,i)=><option key={i} value={i} disabled={portInUse(id,i)}>e{i+1}{portInUse(id,i)?' (occupied)':''}</option>)}
     </select></label>)}
     <label>Cable type<select value={media} onChange={e=>setMedia(e.target.value as Link['media'])}><option>Ethernet</option><option>Fiber</option></select></label>
     <button className="primary-button" disabled={wirePorts.a===''||wirePorts.b===''} onClick={connectOnMap}>Connect ports</button>
    </>}
   </div>}
   {wireMessage&&<p role="status">{wireMessage}</p>}
   <details className="infra-builder"><summary>Add equipment or rearrange the map</summary><div className="infra-toolbar"><label>Equipment <select value={kind} onChange={e=>setKind(e.target.value as Kind)}>{kinds.map(k=><option key={k}>{k}</option>)}</select></label><button className="secondary-button" onClick={add}>Add equipment</button><span>Drag devices to position them.</span></div></details><p className="infra-legend">Click a device to select it. Double-click to open its console. Green means up, red means down, and dashed lines are fiber.</p>
   <div className="infra-canvas" style={{height}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const rect=e.currentTarget.getBoundingClientRect();setWorld(old=>({...old,devices:old.devices.map(d=>d.id===drag?{...d,x:Math.max(0,Math.min(rect.width-120,e.clientX-rect.left-55)),y:Math.max(0,Math.min(height-60,e.clientY-rect.top-26))}:d)}));setDrag(null);}}>
    <svg aria-hidden="true" width="100%" height={height}>{world.links.map((l,i)=>{const a=world.devices.find(d=>d.id===l.a)!,b=world.devices.find(d=>d.id===l.b)!;const onPath=packet.some((id,i)=>(id===l.a&&packet[i+1]===l.b)||(id===l.b&&packet[i+1]===l.a));return <g key={i}><line x1={a.x+55} y1={a.y+22} x2={b.x+55} y2={b.y+22} stroke={linkUp(world,l)?'#80cb71':'#f47780'} strokeDasharray={l.media==='Fiber'?'5 4':undefined} strokeWidth={onPath?5:2}/>{onPath&&<circle r="5" fill="#fff"><animateMotion dur="1s" repeatCount="2" path={`M${a.x+55} ${a.y+22} L${b.x+55} ${b.y+22}`}/></circle>}</g>})}</svg>
    {world.devices.map(d=><button key={d.id} draggable={!wiring} onDragStart={e=>{e.dataTransfer.setData('text/plain',d.id);setDrag(d.id);}} className={'infra-node '+(d.id===device.id||d.id===wireFrom||d.id===wireTo?'selected':'')} style={{left:d.x,top:d.y}} onClick={()=>chooseOnMap(d.id)} onDoubleClick={()=>{if(!wiring)openConsole(d.id);}}><strong>{d.id}</strong><small>{d.kind} · {d.power?'On':'Off'}</small></button>)}
   </div>
  </div>}
  {view==='Racks'&&<div className="infra-racks">{['Network','Compute'].map(room=><div className="panel infra-brief" key={room}><h2>{room} room</h2>{[1,2].map(rack=><section className="infra-rack" key={rack}><h3>Rack {rack} · {world.devices.filter(d=>d.room===room&&d.rack===rack&&d.unit>0).length}/42 U occupied</h3>{world.devices.filter(d=>d.room===room&&d.rack===rack&&d.unit>0).sort((a,b)=>b.unit-a.unit).map(d=><button key={d.id} className={d.id===device.id?'primary-button':'secondary-button'} onClick={()=>choose(d.id)}>U{d.unit} · {d.id} · {d.power?'Powered':'Off'}</button>)}</section>)}</div>)}</div>}
  {view==='Operations'&&<div className="infra-racks">{[
   ['Linux',reachableServers(world).length+' reachable hosts', 'ansible all -m ping'],
   ['Networking',world.links.filter(l=>linkUp(world,l)).length+'/'+world.links.length+' links up','show interfaces'],
   ['Ansible',world.configured.length+' provisioned hosts','show provisioning'],
   ['Podman',world.container?(world.image==='web:stable'&&stable?'web reachable':'web unhealthy'):'No container','podman ps'],
   ['Kubernetes',world.nodeReady?'worker-2 schedulable':'worker-2 cordoned','kubectl get pods'],
   ['Data center',(world.redundant?'Dual power':'Single power feed')+' · '+(world.diskHealthy?'RAID healthy':'RAID degraded'),'show hardware'],
  ].map(([title,status,cmd])=><div key={title} className="panel infra-brief"><h3>{title}</h3><p>{status}</p><button className="secondary-button" onClick={()=>{setTool('Console');execute(cmd);}}>Inspect</button></div>)}</div>}
  <section ref={toolsPanel} className="panel infra-brief" aria-label="Device tools"><h2>Device tools</h2>
   <div className="infra-toolbar">{['Connections','Console','Equipment','Events'].map(name=><button key={name} className={name===tool?'primary-button':'secondary-button'} aria-pressed={name===tool} onClick={()=>setTool(name)}>{name}</button>)}</div>
    <label>Device<select value={device.id} onChange={e=>choose(e.target.value)}>{world.devices.map(d=><option key={d.id}>{d.id}</option>)}</select></label>
    {tool==='Equipment'&&<div className="infra-form">
     <label>IPv4 address /24<input value={device.ip} onChange={e=>patch({ip:e.target.value})}/></label>
     <label>VLAN<input type="number" min="1" max="4094" value={device.vlan} onChange={e=>{const n=e.target.valueAsNumber;if(n>=1&&n<=4094)patch({vlan:n});}}/></label>
     <label>Room<select value={device.room} onChange={e=>{const room=e.target.value;patch({room,unit:world.devices.some(d=>d.id!==device.id&&d.room===room&&d.rack===device.rack&&d.unit===device.unit)?0:device.unit});}}><option>Network</option><option>Compute</option></select></label>
     <label>Rack<select value={device.rack} onChange={e=>{const rack=Number(e.target.value);patch({rack,unit:world.devices.some(d=>d.id!==device.id&&d.room===device.room&&d.rack===rack&&d.unit===device.unit)?0:device.unit});}}><option>1</option><option>2</option></select></label>
     <label>Rack unit<select value={device.unit} onChange={e=>patch({unit:Number(e.target.value)})}><option value={0}>Unracked</option>{Array.from({length:42},(_,i)=>i+1).map(u=><option key={u} disabled={world.devices.some(d=>d.id!==device.id&&d.room===device.room&&d.rack===device.rack&&d.unit===u)}>{u}</option>)}</select></label>
     <button className="secondary-button" onClick={()=>execute(device.power?'power off':'power on')}>{device.power?'Power off':'Power on'}</button>
    </div>}
    {tool==='Connections'&&<>
    <details className="infra-builder"><summary>Add a new cable</summary><div className="infra-toolbar"><label>Peer <select value={target} onChange={e=>setTarget(e.target.value)}><option value="">Select peer</option>{world.devices.filter(d=>d.id!==device.id).map(d=><option key={d.id}>{d.id}</option>)}</select></label><select aria-label="Cable type" value={media} onChange={e=>setMedia(e.target.value as Link['media'])}><option>Ethernet</option><option>Fiber</option></select><button className="secondary-button" disabled={!target||target===device.id} onClick={cable}>Connect cable</button></div></details>
    {world.links.map((l,i)=>[l.a,l.b].includes(device.id)&&<div key={i} className="infra-link"><span>{l.a} e{l.ap+1} ↔ {l.b} e{l.bp+1} · {l.media} · {linkUp(world,l)?'up':'down'}</span><button className="secondary-button" onClick={()=>toggleCable(l)}>{l.connected?'Disconnect':'Reconnect'}</button></div>)}
   </>}
   {tool==='Console'&&<div><h3>{device.id} console <small>e{port+1}</small></h3>
    <p>Test from pc1 with <code>ping srv1</code>. Commands affect this shared environment.</p>
    <div className="infra-console">
     <div ref={consoleLog} className="infra-output" role="log" aria-label="Device console output" tabIndex={0}>
      {transcript.length===0&&<p>{output||'Type help for available commands.'}</p>}
      {transcript.map((entry,i)=><div className="infra-console-entry" key={i}><div><strong>{entry.prompt}</strong> {entry.input}</div><pre>{entry.output}</pre></div>)}
     </div>
     <form className="infra-console-form" onSubmit={e=>{e.preventDefault();execute(line);}}>
      <span aria-hidden="true">{consolePrompt(device,consoleMode,port)}</span>
      <input ref={consoleInput} aria-label="Device command" value={line} spellCheck={false} autoCapitalize="off" autoComplete="off" onChange={e=>setLine(e.target.value)} placeholder="Type a command"
       onKeyDown={e=>{
        if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;
        if(!transcript.length)return;
        e.preventDefault();
        if(historyIndex===null&&e.key==='ArrowDown')return;
        if(historyIndex===null)draft.current=line;
        const index=Math.max(0,Math.min(transcript.length,(historyIndex??transcript.length)+(e.key==='ArrowUp'?-1:1)));
        setHistoryIndex(index===transcript.length?null:index);
        setLine(index===transcript.length?draft.current:transcript[index].input);
       }}/>
      <button className="primary-button" disabled={!line.trim()}>Run</button>
     </form>
    </div>
    <p className="infra-legend"><code>help</code> lists commands · ↑/↓ recalls commands · <code>clear</code> clears the console</p>
   </div>}
    {tool==='Events'&&<div><h3>Recent events</h3><ul>{world.events.slice(-6).reverse().map((e,i)=><li key={i}>{e}</li>)}</ul>
   </div>}
  </section>
 </section>;
}
