import {test} from 'node:test';
import assert from 'node:assert/strict';
import {command,deviceCommand,consolePrompt,scenario,solved,route,makeDevice,type Lab,type Infra} from '../lib/infrastructure';

function run(world:Infra,id:string,...lines:string[]){
 let port=0;
 for(const line of lines)port=command(world,id,line,port).port;
}
const web=['podman volume create app-data','podman network create app-net','podman run --network app-net -v app-data:/data web:stable'];
const repairs:Partial<Record<Lab,(s:Infra)=>void>>={
 vlan:s=>run(s,'sw1','interface e2','switchport access vlan 10'),
 ansible:s=>run(s,'sw1','interface e8','no shutdown','ansible-playbook site.yml'),
 podman:s=>run(s,'srv1',...web),
 kubernetes:s=>run(s,'srv1','kubectl uncordon worker-2','kubectl rollout undo deployment/web','kubectl scale deployment/web --replicas=3'),
 fiber:s=>{s.links.find(l=>l.media==='Fiber')!.connected=true;},
 boot:s=>run(s,'srv1','hardware repair boot'),
 raid:s=>run(s,'san1','hardware replace disk'),
 power:s=>run(s,'srv1','hardware restore feed-b'),
 storage:s=>run(s,'san1','storage start iscsi'),
 monitor:s=>run(s,'sw1','interface e8','no shutdown','monitor enroll all'),
 maintenance:s=>run(s,'srv1','maintenance drain','power off','maintenance update','power on','maintenance resume'),
 recovery:s=>{run(s,'sw1','interface e2','no shutdown');run(s,'san1','storage start iscsi');run(s,'srv1',...web);},
 install:s=>{const d=makeDevice('srv2','Server',4);d.ip='10.10.10.99';s.devices.push(d);s.links.push({a:'sw1',ap:3,b:d.id,bp:0,connected:true,media:'Ethernet'});},
};
for (const [id,repair] of Object.entries(repairs))test('Infrastructure mission: '+id,()=>{
 const lab=id as Lab,world=scenario(lab);
 assert.equal(solved(world,lab),false);
 repair(world);
 assert.equal(solved(world,lab),true);
});
test('Disabled access port interrupts connectivity and the hosted application',()=>{
 const world=scenario('podman');
 run(world,'srv1',...web);
 assert.deepEqual(route(world,'pc1','srv1'),['pc1','sw1','srv1']);
 run(world,'sw1','interface e2','shutdown');
 assert.deepEqual(route(world,'pc1','srv1'),[]);
 assert.equal(solved(world,'podman'),false);
 assert.match(command(world,'srv1','podman ps',0).output,/unreachable/);
});

test('Cooling incident requires Facilities clearance and client verification',()=>{
 const world=scenario('cooling');
 assert.equal(solved(world,'cooling'),false);
 assert.match(command(world,'srv1','power on',0).output,/blocked/);
 run(world,'srv1','incident await-clearance');
 assert.equal(world.cooling?.restored,false);
 run(world,'srv1','incident isolate srv1','incident escalate facilities','incident await-clearance','power on');
 assert.equal(solved(world,'cooling'),false);
 assert.match(command(world,'srv1','verify application',0).output,/client/);
 assert.match(command(world,'pc1','verify application',0).output,/HTTP 200/);
 assert.equal(solved(world,'cooling'),true);
 run(world,'srv1','power off','power on');
 assert.equal(solved(world,'cooling'),false);
 assert.equal(solved(scenario('cooling'),'cooling'),false);
});

test('Cisco console accepts enable and follows configuration prompts',()=>{
 const world=scenario('vlan');
 const sw=world.devices.find(d=>d.id==='sw1')!;
 const enabled=deviceCommand(world,sw,'en',0,'user');
 assert.equal(consolePrompt(sw,enabled.mode,0),'sw1#');
 const config=deviceCommand(world,sw,'conf t',0,enabled.mode);
 assert.equal(consolePrompt(sw,config.mode,0),'sw1(config)#');
 const iface=deviceCommand(world,sw,'int Ethernet 2',0,config.mode);
 assert.equal(iface.port,1);
 assert.equal(consolePrompt(sw,iface.mode,iface.port),'sw1(config-if)#');
 deviceCommand(world,sw,'switchport access vlan 10',iface.port,iface.mode);
 assert.equal(solved(world,'vlan'),true);
 assert.equal(deviceCommand(world,sw,'end',iface.port,iface.mode).mode,'privileged');
 assert.equal(deviceCommand(world,sw,'enable',0,'user').mode,'privileged');
});
