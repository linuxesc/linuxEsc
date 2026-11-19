export type Kind = 'Switch'|'Router'|'Server'|'PC'|'Firewall'|'Storage';
export type Device = {id:string;kind:Kind;x:number;y:number;ip:string;vlan:number;power:boolean;room:string;rack:number;unit:number;ports:boolean[]};
export type Link = {a:string;ap:number;b:string;bp:number;media:'Ethernet'|'Fiber';connected:boolean};
export type Lab = 'cooling'|'free'|'vlan'|'ansible'|'podman'|'kubernetes'|'fiber'|'raid'|'power'|'storage'|'boot'|'maintenance'|'monitor'|'install'|'recovery';
export type Infra = {devices:Device[];links:Link[];configured:string[];volume:boolean;network:boolean;container:boolean;image:string;nodeReady:boolean;replicas:number;diskHealthy:boolean;redundant:boolean;bootable:boolean;monitoring:string[];storage:boolean;events:string[];cooling?:{isolated:boolean;escalated:boolean;restored:boolean;verified:boolean}};
export const catalog: {id:Lab;path:number;level:number;title:string;brief:string;hint:string;answer:string}[] = [
 {id:'vlan',path:1,level:0,title:'Repair an access VLAN',brief:'PC1 cannot reach srv1 on the same subnet. Inspect both switch ports and restore connectivity on VLAN 10.',hint:'Select sw1. Compare show vlan brief with the endpoints. Set interface e2 to access VLAN 10.',answer:'I compare port VLAN membership first, then confirm the fix with a ping from the affected endpoint.'},
 {id:'ansible',path:2,level:1,title:'Provision ten hosts',brief:'srv7 is unreachable. Restore its switch link, then converge all ten hosts using the playbook.',hint:'Check ansible all -m ping, enable sw1 e8, then run ansible-playbook site.yml.',answer:'I check inventory reachability, repair the failed host, then rerun the idempotent playbook and check the recap.'},
 {id:'podman',path:3,level:1,title:'Recover a Podman application',brief:'The application is down and needs persistent data and an application network.',hint:'Create app-data and app-net. Try podman run --network app-net -v app-data:/data web:broken, inspect logs, then deploy web:stable.',answer:'I inspect the logs and check mounts, networking, and image version before replacing a failed container.'},
 {id:'kubernetes',path:4,level:2,title:'Recover production Kubernetes',brief:'A worker is cordoned and the web deployment has a bad image. Restore the worker, deploy a working image, and bring up three replicas.',hint:'Use kubectl get nodes, kubectl get pods, kubectl uncordon worker-2, kubectl set image deployment/web web=web:stable, and kubectl scale deployment/web --replicas=3.',answer:'I establish whether the fault is in scheduling or the workload, fix the node and image, then check service health.'},
 {id:'fiber',path:5,level:0,title:'Disconnected fiber uplink',brief:'The storage rack uplink is disconnected. Find it in the topology and reconnect it.',hint:'Inspect sw1 with show interfaces. Use the cabling panel to reconnect the fiber link to san1.',answer:'I inspect transceiver and port state, trace the patch path, and verify connectivity after reseating the cable.'},
 {id:'install',path:5,level:0,title:'Install a rack server',brief:'Install a server in an available rack unit and connect it to an unused switch port.',hint:'Add a Server, configure its address and rack unit, then use Connect cable.',answer:'I verify rack space, power and switch capacity before installing and documenting the server.'},
 {id:'boot',path:5,level:1,title:'Restore a boot device',brief:'srv1 is powered but fails POST. Inspect the BMC event and recover its boot device.',hint:'Select srv1 and use show hardware, then hardware repair boot.',answer:'I use the management console to distinguish a boot device fault from a power or OS fault.'},
 {id:'raid',path:5,level:1,title:'Restore RAID redundancy',brief:'san1 reports a failed drive and degraded RAID. Replace the simulated disk and verify the array.',hint:'Select san1, run show hardware, then hardware replace disk.',answer:'I identify the failed slot, replace only that drive and verify the array has rebuilt.'},
 {id:'power',path:5,level:1,title:'Restore the second power feed',brief:'The B feed is offline. Restore redundancy without powering off the device.',hint:'Select srv1, inspect show hardware, and run hardware restore feed-b.',answer:'I confirm the remaining feed is healthy before restoring the failed feed and checking redundancy.'},
 {id:'storage',path:5,level:2,title:'Restore iSCSI access',brief:'The SAN responds on the network but the iSCSI target is inactive.',hint:'Select san1, run show hardware, then storage start iscsi.',answer:'I separate link and IP reachability from target availability, then verify the initiator can reconnect.'},
 {id:'monitor',path:5,level:2,title:'Monitor twenty servers',brief:'Enroll all twenty Linux hosts in monitoring. Restore the failed link before checking coverage.',hint:'Run monitor enroll all, identify missing hosts from the output, and enable sw1 e8 before retrying.',answer:'I check coverage against inventory and resolve unreachable hosts before declaring monitoring complete.'},
 {id:'maintenance',path:5,level:2,title:'Maintain a production server',brief:'Drain srv1 before shutdown. Restore it to service after the simulated update.',hint:'On srv1 use maintenance drain, power off, maintenance update, power on, and maintenance resume.',answer:'I drain traffic, verify the host is safe to stop, patch and reboot, then verify health before restoring traffic.'},
 {id:'cooling',path:5,level:2,title:'Data Center Cooling Failure',brief:'APP-01 is unreachable and the room has a critical thermal alert. Diagnose before restarting equipment.',hint:'On srv1 inspect show environment and show hardware. Confirm isolation, escalate to Facilities, and wait for the simulated clearance. Restore power and verify from pc1.',answer:'A whole-room thermal alert and protective host shutdown point to cooling rather than a cable. Coordinate with Facilities, wait for clearance, then verify from a client.'},
 {id:'recovery',path:5,level:3,title:'Recover the application stack',brief:'A disabled access port, offline storage target and failed web image have interrupted service.',hint:'Restore sw1 e2, start iSCSI on san1, then apply the Podman volume, network and stable image recipe.',answer:'I recover dependencies in order and validate service availability from the client side.'},
];
export const paths = ['Linux System Administrator','CCNA & Network Engineer','Ansible Automation Engineer','Podman & Container Engineer','Kubernetes Engineer','Data Center Infrastructure Engineer'];
export const levels=['Beginner','Intermediate','Advanced','Expert'];
export const kinds:Kind[]=['Switch','Router','Server','PC','Firewall','Storage'];
export function makeDevice(id:string,kind:Kind,index:number):Device {
 return {id,kind,x:30+(index%4)*165,y:35+Math.floor(index/4)*90,ip:'',vlan:10,power:true,room:index%2?'Compute':'Network',rack:index%2+1,unit:index+1,ports:Array(kind==='Switch'?24:4).fill(true)};
}
export function scenario(lab:Lab):Infra {
 const count=lab==='monitor'?20:lab==='ansible'?10:1;
 const devices=[makeDevice('sw1','Switch',0),makeDevice('pc1','PC',1),...Array.from({length:count},(_,i)=>makeDevice('srv'+(i+1),'Server',i+2)),makeDevice('san1','Storage',count+2)];
 devices.forEach((d,i)=>{d.ip='10.10.10.'+(i+1)});
 const links=devices.slice(1).map((d,i):Link=>({a:'sw1',ap:i,b:d.id,bp:0,media:d.kind==='Storage'?'Fiber':'Ethernet',connected:!(lab==='fiber'&&d.kind==='Storage')}));
 if(lab==='ansible'||lab==='monitor')devices[0].ports[7]=false;
 if(lab==='recovery')devices[0].ports[1]=false;
 if(lab==='vlan') devices[0].vlan=10;
 if(lab==='cooling')devices.find(d=>d.id==='srv1')!.power=false;
 return {devices,links,...(lab==='cooling'?{cooling:{isolated:false,escalated:false,restored:false,verified:false}}:{}),configured:[],volume:false,network:false,container:false,image:'web:broken',nodeReady:lab!=='kubernetes',replicas:1,diskHealthy:lab!=='raid',redundant:lab!=='power',bootable:lab!=='boot',monitoring:[],storage:!['storage','recovery'].includes(lab),events:[lab==='cooling'?'THERMAL CRITICAL: srv1 protective shutdown. Application probe failed.':lab==='vlan'?'Access port e2 assigned VLAN 20.':lab==='boot'?'BMC srv1: boot device unavailable.':lab==='raid'?'san1: RAID degraded. Disk slot 2 failed.':lab==='power'?'PDU feed B offline. Feed A carrying load.':'Scenario initialized.',...(lab==='vlan'?['vlan:sw1:1:20']:[])]};
}
const get=(s:Infra,id:string)=>s.devices.find(d=>d.id===id);
const portVlan=(s:Infra,d:Device,p:number)=>Number([...s.events].reverse().find(e=>e.startsWith('vlan:'+d.id+':'+p+':'))?.split(':')[3]??d.vlan);
export function linkUp(s:Infra,l:Link) {
 const a=get(s,l.a),b=get(s,l.b);
 return !!(l.connected&&a?.power&&b?.power&&a.ports[l.ap]&&b.ports[l.bp]&&portVlan(s,a,l.ap)===portVlan(s,b,l.bp));
}
export function route(s:Infra,from:string,to:string):string[] {
 const a=get(s,from),b=s.devices.find(d=>d.id===to||d.ip===to);
 const validIp=(ip:string)=>/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)&&ip.split('.').every(part=>Number(part)<=255);
 if(!a?.power||!b?.power||!validIp(a.ip)||!validIp(b.ip)||a.ip.split('.').slice(0,3).join('.')!==b.ip.split('.').slice(0,3).join('.'))return [];
 if(b.id==='srv1'&&!s.bootable)return [];
 const queue=[[a.id]],visited=new Set([a.id]);
 while(queue.length){
  const path=queue.shift()!,current=path.at(-1)!;
  if(current===b.id)return path;
  if(current!==from&&get(s,current)?.kind!=='Switch')continue;
  const incoming=s.links.find(l=>[l.a,l.b].includes(current)&&[l.a,l.b].includes(path.at(-2)??''));
  for(const l of s.links.filter(l=>linkUp(s,l)&&(l.a===current||l.b===current))){
   const next=l.a===current?l.b:l.a;
   const port=(link:Link)=>link.a===current?link.ap:link.bp;
   if(incoming&&portVlan(s,get(s,current)!,port(incoming))!==portVlan(s,get(s,current)!,port(l)))continue;
   if(!visited.has(next)){visited.add(next);queue.push([...path,next]);}
  }
 }
 return [];
}
export const reachableServers=(s:Infra)=>s.devices.filter(d=>d.kind==='Server'&&route(s,'pc1',d.id).length).map(d=>d.id);
const live=(s:Infra)=>s.container&&s.image==='web:stable'&&!!route(s,'pc1','srv1').length;
export function solved(s:Infra,lab:Lab) {
 switch(lab){
  case 'cooling': return !!s.cooling?.restored&&s.cooling.verified&&!!route(s,'pc1','srv1').length;
  case 'vlan': return !!route(s,'pc1','srv1').length;
  case 'ansible': return s.configured.length===10&&reachableServers(s).length===10;
  case 'podman': return live(s)&&s.volume&&s.network;
  case 'kubernetes': return s.nodeReady&&s.image==='web:stable'&&s.replicas>=3&&!!route(s,'pc1','srv1').length;
  case 'fiber': return !!route(s,'pc1','san1').length;
  case 'install': return reachableServers(s).length>=2&&s.devices.some(d=>d.kind==='Server'&&d.id!=='srv1'&&d.unit>0);
  case 'boot': return s.bootable&&!!route(s,'pc1','srv1').length;
  case 'raid': return s.diskHealthy;
  case 'power': return s.redundant&&!!get(s,'srv1')?.power;
  case 'storage': return s.storage&&!!route(s,'pc1','san1').length;
  case 'monitor': return s.monitoring.length>=20&&reachableServers(s).length>=20;
  case 'maintenance': return s.events.includes('Maintenance completed')&&!!route(s,'pc1','srv1').length;
  case 'recovery': return s.storage&&live(s);
  default:return false;
 }
}
export function command(s:Infra,id:string,input:string,port:number):{output:string;port:number;packet?:string[]} {
 const d=get(s,id),words=input.trim().split(/\s+/), text=words.join(' ');
 const result=(output:string,next=port,packet?:string[])=>({output,port:next,packet});
 if(!d)return result('Select a device first.');
 if(s.cooling){
  const cooling=s.cooling;
  if(text==='help')return result('show environment | show hardware | incident isolate srv1 | incident escalate facilities | incident await-clearance | power on | ping srv1 | verify application');
  if(text==='show environment')return result(cooling.restored?'Facilities cleared recovery. Inlet 23°C, cooling available.':'Inlet 39°C (simulated) and rising. Both cooling units alarmed. Thermal restart interlock active.');
  if(text==='incident isolate srv1'){
   if(get(s,'srv1')?.power)return result('Isolation requires srv1 to be powered off.');
   cooling.isolated=true;s.events.push('Operations confirmed srv1 safely isolated.');return result('Isolation recorded.');
  }
  if(text==='incident escalate facilities'){cooling.escalated=true;s.events.push('Facilities escalation acknowledged.');return result('Facilities owns the cooling repair. Keep srv1 isolated.');}
  if(text==='incident await-clearance'){
   if(!cooling.isolated||!cooling.escalated)return result('Confirm isolation and escalate first.');
   cooling.restored=true;s.events.push('Simulated facilities clearance received. Inlet stable at 23°C.');return result('Cooling restored and stable. Restart srv1 and verify from pc1.');
  }
  if(text==='power on'&&id==='srv1'&&!cooling.restored)return result('Restart blocked: no Facilities clearance.');
  if(text==='verify application'){
   if(id!=='pc1')return result('Verify from the client pc1.');
   cooling.verified=!!route(s,'pc1','srv1').length;
   return result(cooling.verified?'HTTP 200 (simulated). Client recovery verified.':'HTTP probe failed. Check power and reachability.');
  }
 }
 if(text==='help')return result('show ip interface brief | show interfaces | show vlan brief | show ip route | show running-config | show hardware\ninterface eN | shutdown | no shutdown | switchport access vlan N | ping HOST | traceroute HOST\nansible all -m ping | ansible-playbook site.yml | podman ps | podman logs web | kubectl get nodes | kubectl get pods');
 if(words[0]==='ping'||words[0]==='traceroute'){
  const path=route(s,id,words[1]);
  return result(path.length?words[0]==='ping'?'Reply from '+path.at(-1)+' (simulated)':'Layer 2 path: '+path.join(' → ')+'; no routed hops':'Destination unreachable',port,path);
 }
 const int=text.match(/^interface e(\d+)$/i);
 if(int)return Number(int[1])>=1&&Number(int[1])<=d.ports.length?result('Selected e'+int[1],Number(int[1])-1):result('Unknown interface.');
 if(text==='shutdown'||text==='no shutdown'){d.ports[port]=text==='no shutdown';s.events.push(id+' e'+(port+1)+' '+text);return result('Interface updated.');}
 const vlan=text.match(/^switchport access vlan (\d+)$/);
 if(vlan){const n=Number(vlan[1]);if(d.kind!=='Switch'||n<1||n>4094)return result('Requires a switch and VLAN 1–4094.');s.events.push('vlan:'+id+':'+port+':'+n);return result('Access VLAN updated.');}
 if(['show ip interface brief','show interfaces','show vlan brief','show running-config'].includes(text))return result(d.id+' '+d.ip+'\n'+d.ports.map((up,i)=>{const l=s.links.find(l=>(l.a===id&&l.ap===i)||(l.b===id&&l.bp===i));return 'e'+(i+1)+'  '+(!up?'admin-down':l&&linkUp(s,l)?'up':'down')+'  VLAN '+portVlan(s,d,i);}).join('\n'));
 if(text==='show ip route')return result(d.ip?'C '+d.ip.split('.').slice(0,3).join('.')+'.0/24 directly connected\nNo default route configured.':'No connected route.');
 if(text==='show provisioning')return result(s.configured.length?s.configured.join('\n'):'No hosts provisioned.');
 if(text==='show hardware')return result('Power: '+(d.power?'on':'off')+' | Feed B: '+(s.redundant?'healthy':'failed')+' | POST: '+(s.bootable?'ready':'boot failure')+' | RAID: '+(s.diskHealthy?'healthy':'degraded')+' | iSCSI: '+(s.storage?'active':'inactive'));
 if(text==='hardware repair boot'&&id==='srv1'){s.bootable=true;return result('POST complete. Boot device online.');}
 if(text==='hardware replace disk'&&d.kind==='Storage'){s.diskHealthy=true;return result('Replacement installed. Simulated rebuild complete.');}
 if(text==='hardware restore feed-b'&&id==='srv1'){s.redundant=true;return result('Dual feed redundancy restored.');}
 if(text==='storage start iscsi'&&d.kind==='Storage'){s.storage=true;return result('iSCSI target active.');}
 if(text==='maintenance drain'&&d.kind==='Server'&&d.power){s.events.push(id+' drained');return result('Workload drained.');}
 if(text==='power off'||text==='power on'){if(id==='srv1'&&s.cooling)s.cooling.verified=false;d.power=text==='power on';return result('Power '+(d.power?'on':'off'));}
 if(text==='maintenance update'&&!d.power&&s.events.includes(id+' drained')){s.events.push(id+' updated');return result('Offline update applied.');}
 if(text==='maintenance resume'&&d.power&&s.events.includes(id+' updated')){s.events.push('Maintenance completed');return result('Workload resumed.');}
 if(['ansible all -m ping','ansible-playbook site.yml','monitor enroll all'].includes(text)){
  const hosts=reachableServers(s);
  if(text==='ansible-playbook site.yml')s.configured=[...new Set([...s.configured,...hosts])];
  if(text==='monitor enroll all')s.monitoring=hosts;
  return result(s.devices.filter(d=>d.kind==='Server').map(d=>d.id+' : '+(hosts.includes(d.id)?text==='ansible all -m ping'?'SUCCESS pong':'OK':'UNREACHABLE')).join('\n'));
 }
 if(text==='podman volume create app-data'){s.volume=true;return result('app-data');}
 if(text==='podman network create app-net'){s.network=true;return result('app-net');}
 if(words[0]==='podman'&&words[1]==='run'){
  const net=words.indexOf('--network'),vol=words.indexOf('-v'),image=words.at(-1)!;
  if(!s.volume||!s.network||net<0||vol<0||words[net+1]!=='app-net'||words[vol+1]!=='app-data:/data')return result('Missing app-net network or app-data:/data volume.');
  if(!['web:stable','web:broken'].includes(image))return result('Image unavailable in simulated registry.');
  s.image=image;s.container=true;return result(live(s)?'web running':'web exited or unreachable. Inspect podman logs web.');
 }
 if(text==='podman ps'||text==='podman logs web')return result(!s.container?'No web container.':s.image!=='web:stable'?'web exited: startup configuration missing':live(s)?'web running and reachable':'web running locally; network unreachable');
 if(text==='kubectl get nodes')return result('worker-1 Ready\nworker-2 '+(s.nodeReady?'Ready':'Ready,SchedulingDisabled'));
 if(text==='kubectl get pods')return result('web  '+(!route(s,'pc1','srv1').length?'Unreachable':s.image!=='web:stable'?'ImagePullBackOff':s.nodeReady?s.replicas+'/'+s.replicas+' Running':'Pending'));
 if(text==='kubectl uncordon worker-2'){s.nodeReady=true;return result('worker-2 uncordoned');}
 if(text==='kubectl set image deployment/web web=web:stable'||text==='kubectl rollout undo deployment/web'){s.image='web:stable';return result('Deployment updated.');}
 const replicas=text.match(/^kubectl scale deployment\/web --replicas=(\d+)$/);
 if(replicas&&Number(replicas[1])<=20){s.replicas=Number(replicas[1]);return result('Deployment scaled.');}
 return result('Unsupported command in this simulation. Type help or inspect the lab hint.');
}
