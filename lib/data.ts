export type LatLng={lat:number;lng:number};
export type Dest={id:string;name:string;address:string;coordinates:LatLng};
export const FALLBACK:LatLng={lat:51.5080,lng:-0.1281};
export const DESTS:Dest[]=[
{id:"dest_1",name:"King's Cross Station",address:"Euston Rd, London N1 9AL",coordinates:{lat:51.5320,lng:-0.1240}},
{id:"dest_2",name:"Soho",address:"Soho Square, London W1D 3QU",coordinates:{lat:51.5136,lng:-0.1318}},
{id:"dest_3",name:"London Heathrow Airport",address:"Longford TW6, Hounslow",coordinates:{lat:51.4700,lng:-0.4543}},
{id:"dest_4",name:"Shoreditch High Street",address:"Shoreditch High St, London E1 6JQ",coordinates:{lat:51.5235,lng:-0.0775}},
{id:"dest_5",name:"Tower Bridge",address:"Tower Bridge Rd, London SE1 2UP",coordinates:{lat:51.5055,lng:-0.0754}},
{id:"dest_6",name:"London Eye",address:"Riverside Building, London SE1 7PB",coordinates:{lat:51.5033,lng:-0.1195}},
{id:"dest_7",name:"Camden Market",address:"Camden Lock Pl, London NW1 8AF",coordinates:{lat:51.5415,lng:-0.1466}},
{id:"dest_8",name:"Canary Wharf",address:"Canary Wharf, London E14 5AB",coordinates:{lat:51.5054,lng:-0.0235}},
{id:"dest_9",name:"Paddington Station",address:"Praed St, London W2 1HQ",coordinates:{lat:51.5154,lng:-0.1755}},
{id:"dest_10",name:"Buckingham Palace",address:"London SW1A 1AA",coordinates:{lat:51.5014,lng:-0.1419}}];
export const TIERS=[
{id:"cheap",name:"Standard",tag:"Cheap",cars:"Toyota Prius or similar",base:2.5,mile:1.25,seats:4,speed:1},
{id:"mid",name:"Comfort",tag:"Middle",cars:"Tesla Model 3, Polestar 2",base:3.5,mile:1.6,seats:4,speed:1},
{id:"prem",name:"Executive",tag:"Premium",cars:"Mercedes E-Class, LEVC TX",base:6,mile:2.5,seats:4,speed:1}];
export const DRIVERS:Record<string,any>={
cheap:{id:"drv_884",name:"Ahmed",rating:4.9,vehicle:{make:"Toyota",model:"Prius",color:"Silver",plate:"LD22 RTY"},eta_minutes:3},
mid:{id:"drv_512",name:"Priya",rating:4.95,vehicle:{make:"Tesla",model:"Model 3",color:"White",plate:"LC71 EVX"},eta_minutes:4},
prem:{id:"drv_207",name:"James",rating:4.98,vehicle:{make:"Mercedes",model:"E-Class",color:"Black",plate:"LB23 BLK"},eta_minutes:5}};
export function miles(a:LatLng,b:LatLng){const R=3958.8,r=(x:number)=>x*Math.PI/180;const dLat=r(b.lat-a.lat),dLng=r(b.lng-a.lng);
const h=Math.sin(dLat/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(h))*1.3} // 1.3 = road winding factor
export const fare=(t:typeof TIERS[0],mi:number)=>Math.round((t.base+t.mile*mi)*100)/100;
export const lerp=(a:LatLng,b:LatLng,t:number):LatLng=>({lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t});
