"use client";
import {MapContainer,TileLayer,Marker,Polyline,useMap} from "react-leaflet";
import L from "leaflet";
import {useEffect} from "react";
import {LatLng} from "../lib/data";
const cabIcon=L.divIcon({className:"car-icon",iconSize:[40,40],iconAnchor:[20,20],html:`<div style="width:40px;height:40px;border-radius:20px;background:#0a0a0e;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 4px #facc1533,0 0 22px #facc15aa;border:2px solid #facc15">${"<svg width='28' height='18' viewBox='0 0 56 34'><path d='M4 24 L8 12 Q10 6 18 6 L38 6 Q46 6 50 14 L54 22 L54 28 L4 28Z' fill='#fff'/><rect x='14' y='10' width='12' height='8' rx='1' fill='#111'/><rect x='30' y='10' width='12' height='8' rx='1' fill='#111'/><circle cx='16' cy='28' r='5' fill='#444'/><circle cx='42' cy='28' r='5' fill='#444'/></svg>"}</div>`});
const pin=(c:string,l:string)=>L.divIcon({className:"pin-icon",iconSize:[80,56],iconAnchor:[40,48],html:`<div style="display:flex;flex-direction:column;align-items:center"><div style="background:rgba(10,10,14,.85);backdrop-filter:blur(6px);color:#fff;font:600 11px/1 ui-rounded,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;padding:5px 10px;border-radius:12px;border:1px solid ${c};box-shadow:0 0 14px ${c}88">${l}</div><div style="position:relative;width:14px;height:14px;margin-top:8px"><span class="ct-pulse" style="background:${c}"></span><span style="position:absolute;inset:3px;border-radius:50%;background:${c};box-shadow:0 0 10px ${c}"></span></div></div>`});
const car=L.divIcon({className:"car-icon",iconSize:[36,36],iconAnchor:[18,18],html:`<div style="width:36px;height:36px;border-radius:18px;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 8px #0008">🚗</div>`});
const mkCar=(e:string,bg:string)=>L.divIcon({className:"car-icon",iconSize:[44,44],iconAnchor:[22,22],html:`<div style="width:44px;height:44px;border-radius:22px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 0 0 4px ${bg}55,0 0 20px ${bg}">${e}</div>`});
function Fit({a,b,center,tick,pad}:{a:LatLng;b?:LatLng|null;center:LatLng;tick:number;pad:number}){const m=useMap();
useEffect(()=>{if(b){m.fitBounds(L.latLngBounds([a.lat,a.lng],[b.lat,b.lng]),{paddingTopLeft:[40,40],paddingBottomRight:[40,pad],animate:true})}else m.setView([center.lat,center.lng],15,{animate:true})},[b?.lat,b?.lng,tick,center.lat,center.lng,pad]);return null}
export default function Map({pickup,dest,carPos,tick,pad,cab,showStd,emoji,bg}:{showStd?:boolean;emoji?:string;bg?:string;pickup:LatLng;dest:LatLng|null;carPos:LatLng|null;tick:number;pad:number;cab?:{red:LatLng[];green:LatLng[]}|null}){
return <MapContainer center={[pickup.lat,pickup.lng]} zoom={15} zoomControl={false} attributionControl={true} style={{height:"100%",width:"100%"}}>
<TileLayer className="ct-tiles" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors"/>
<Fit a={pickup} b={dest} center={pickup} tick={tick} pad={pad}/>
<Marker position={[pickup.lat,pickup.lng]} icon={pin("#5eead4","Pickup")}/>
{dest&&<Marker position={[dest.lat,dest.lng]} icon={pin("#ff2bd6","Drop-off")}/>}
{cab&&showStd&&<Polyline positions={cab.red.map(p=>[p.lat,p.lng] as [number,number])} pathOptions={{color:"#ff8a4c",weight:4,opacity:.6,dashArray:"1 9",lineCap:"round"}}/>}
{cab&&<Polyline positions={cab.green.map(p=>[p.lat,p.lng] as [number,number])} pathOptions={{color:"#ff2bd6",weight:18,opacity:.16,lineCap:"round"}}/>}
{cab&&<Polyline positions={cab.green.map(p=>[p.lat,p.lng] as [number,number])} pathOptions={{color:"#ff2bd6",weight:9,opacity:.4,lineCap:"round"}}/>}
{cab&&<Polyline className="ct-flow" positions={cab.green.map(p=>[p.lat,p.lng] as [number,number])} pathOptions={{color:"#ffd6f6",weight:3,dashArray:"10 14",lineCap:"round"}}/>}
{carPos&&<Marker position={[carPos.lat,carPos.lng]} icon={cab&&showStd?cabIcon:mkCar(emoji||"🚗",bg||"#111")} zIndexOffset={1000}/>}
</MapContainer>}
