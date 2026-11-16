export type Role='now'|'next';
export type World={t:number;power:'pump'|'bridge';cartHeld:boolean;cartRoute:'bridge'|'safe';cart:number;cake:'travelling'|'safe'|'spilled';ferryHeld:boolean;ferry:number;bridgeQueued:boolean;bridgeCharge:number;bridgeOpen:boolean;gateClosed:boolean;water:number;peak:number;ferrySafe:boolean;failed:string;events:{at:number;text:string}[]};
export function start():World{return{t:0,power:'pump',cartHeld:false,cartRoute:'bridge',cart:0,cake:'travelling',ferryHeld:false,ferry:0,bridgeQueued:false,bridgeCharge:0,bridgeOpen:false,gateClosed:false,water:0,peak:0,ferrySafe:false,failed:'',events:[{at:0,text:'Chester: Ferry due at 01:00. Tide rises at 01:10. Save the ferry and keep the quay dry.'}]}}
export function note(w:World,text:string){w.events=[...w.events,{at:w.t,text}].slice(-30)}
export function action(world:World,role:Role,command:string):World{const w=structuredClone(world);if(w.failed)return w;
 if(role==='now'){
 if(command==='power'){w.power=w.power==='pump'?'bridge':'pump';note(w,'NOW routed the generator to the '+w.power+'.');}
 if(command==='cart'){w.cartHeld=!w.cartHeld;note(w,'NOW '+(w.cartHeld?'paused':'released')+' the cake cart.');}
 if(command==='route'&&w.cart<60){w.cartRoute=w.cartRoute==='bridge'?'safe':'bridge';note(w,'NOW set the cart route to '+(w.cartRoute==='safe'?'the festival path.':'the bridge shortcut.'));}
 }else{
 if(command==='hold'){w.ferryHeld=!w.ferryHeld;note(w,'NEXT '+(w.ferryHeld?'held the ferry at the buoy.':'released the ferry.'));}
 if(command==='bridge'&&!w.bridgeOpen){w.bridgeQueued=!w.bridgeQueued;note(w,'NEXT '+(w.bridgeQueued?'queued the bridge opening. It needs generator power.':'canceled the bridge opening.'));}
 if(command==='gate'){w.gateClosed=!w.gateClosed;note(w,'NEXT '+(w.gateClosed?'closed':'opened')+' the tide gate.');}
 }
 return w;
}
export function tick(world:World,role:Role):World{let w=structuredClone(world);if(w.failed||w.t>=180)return w;w.t++;
 // Scripted partner acts on deterministic rules, never reads a player's intent.
 if(role==='now'){
 if(w.t===12&&!w.ferryHeld)w=action(w,'next','hold');
 if(w.t===20&&!w.bridgeQueued)w=action(w,'next','bridge');
 if(w.t===55&&!w.gateClosed)w=action(w,'next','gate');
 if(w.bridgeOpen&&w.ferryHeld)w=action(w,'next','hold');
 }else{
 if(w.t===8&&w.cartRoute!=='safe')w=action(w,'now','route');
 if(w.bridgeQueued&&!w.bridgeOpen&&w.power!=='bridge')w=action(w,'now','power');
 if(w.bridgeOpen&&w.power!=='pump')w=action(w,'now','power');
 }
 if(w.bridgeQueued&&w.power==='bridge'&&!w.bridgeOpen){w.bridgeCharge++;if(w.bridgeCharge>=12){w.bridgeOpen=true;note(w,'The bridge is open. The pump can have power again.');}}
 if(!w.cartHeld&&w.cake==='travelling'){
 w.cart+=1.4;if(w.cart>=60&&w.cart<=75&&w.cartRoute==='bridge'&&w.bridgeOpen){w.cake='spilled';note(w,'Cake overboard: the moving cart reached the open bridge.');}
 else if(w.cart>=100){w.cake='safe';note(w,w.cartRoute==='safe'?'Cake delivered by the festival path.':'Cake delivered across the shortcut.');}}
 if(w.t>=60&&!w.ferryHeld&&!w.ferrySafe){w.ferry+=1.2;if(w.ferry>=60&&!w.bridgeOpen){w.failed='The ferry reached a closed bridge. NEXT can hold it; opening needs NOW to route generator power.';note(w,w.failed)}else if(w.ferry>=100){w.ferrySafe=true;note(w,'The ferry is safely home.');}}
 if(w.t>=70&&w.t<=135)w.water=Math.min(100,Math.max(0,w.water+(w.gateClosed?1.6:3.7)-(w.power==='pump'?2:0)));else w.water=Math.max(0,w.water-(w.power==='pump'?2:0));
 w.peak=Math.max(w.peak,w.water);if(w.water>=100&&!w.failed){w.failed='The quay flooded. The tide gate reduces incoming water; the pump needs generator power.';note(w,w.failed)}
 if(w.t===70)note(w,'The tide surge has begun. Power away from the pump raises the water.');if(w.t===136)note(w,'The tide surge has passed.');if(w.t===180&&!w.ferrySafe&&!w.failed){w.failed='The ferry never reached home. Holding it buys time, but it must be released once the bridge is open.';note(w,w.failed)}return w;
}
