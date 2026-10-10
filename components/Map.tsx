"use client";
import {MapContainer,TileLayer,Marker,Polyline,useMap} from "react-leaflet";
import L from "leaflet";
import {useEffect} from "react";
import {LatLng} from "../lib/data";
const cabIcon=L.divIcon({className:"car-icon",iconSize:[40,40],iconAnchor:[20,20],html:`<div style="width:40px;height:40px;border-radius:20px;background:#111;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px #0008;border:2px solid #facc15">${"<svg width='28' height='18' viewBox='0 0 56 34'><path d='M4 24 L8 12 Q10 6 18 6 L38 6 Q46 6 50 14 L54 22 L54 28 L4 28Z' fill='#fff'/><rect x='14' y='10' width='12' height='8' rx='1' fill='#111'/><rect x='30' y='10' width='12' height='8' rx='1' fill='#111'/><circle cx='16' cy='28' r='5' fill='#444'/><circle cx='42' cy='28' r='5' fill='#444'/></svg>"}</div>`});
const pin=(c:string,l:string)=>L.divIcon({className:"pin-icon",iconSize:[60,44],iconAnchor:[30,44],html:`<div style="display:flex;flex-direction:column;align-items:center"><div style="background:${c};color:#fff;font:700 11px sans-serif;padding:3px 8px;border-radius:10px">${l}</div><div style="width:4px;height:12px;background:${c}"></div><div style="width:10px;height:10px;border-radius:5px;background:${c};margin-top:-2px"></div></div>`});
const car=L.divIcon({className:"car-icon",iconSize:[36,36],iconAnchor:[18,18],html:`<div style="width:36px;height:36px;border-radius:18px;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 8px #0008">🚗</div>`});
function Fit({a,b,center,tick,pad}:{a:LatLng;b?:LatLng|null;center:LatLng;tick:number;pad:number}){const m=useMap();
useEffect(()=>{if(b){m.fitBounds(L.latLngBounds([a.lat,a.lng],[b.lat,b.lng]),{paddingTopLeft:[40,40],paddingBottomRight:[40,pad],animate:true})}else m.setView([center.lat,center.lng],15,{animate:true})},[b?.lat,b?.lng,tick,center.lat,center.lng,pad]);return null}
export default function Map({pickup,dest,carPos,tick,pad,cab}:{pickup:LatLng;dest:LatLng|null;carPos:LatLng|null;tick:number;pad:number;cab?:{red:LatLng[];green:LatLng[]}|null}){
return <MapContainer center={[pickup.lat,pickup.lng]} zoom={15} zoomControl={false} attributionControl={true} style={{height:"100%",width:"100%"}}>
<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors"/>
<Fit a={pickup} b={dest} center={pickup} tick={tick} pad={pad}/>
<Marker position={[pickup.lat,pickup.lng]} icon={pin("#16a34a","Pickup")}/>
{dest&&<Marker position={[dest.lat,dest.lng]} icon={pin("#dc2626","Drop-off")}/>}
{dest&&!cab&&<Polyline positions={[[pickup.lat,pickup.lng],[dest.lat,dest.lng]]} pathOptions={{color:"#111",weight:4,dashArray:"2 8"}}/>}
{cab&&<Polyline positions={cab.red.map(p=>[p.lat,p.lng] as [number,number])} pathOptions={{color:"#dc2626",weight:6,opacity:.85}}/>}
{cab&&<Polyline positions={cab.green.map(p=>[p.lat,p.lng] as [number,number])} pathOptions={{color:"#16a34a",weight:6}}/>}
{carPos&&<Marker position={[carPos.lat,carPos.lng]} icon={cab?cabIcon:car} zIndexOffset={1000}/>}
</MapContainer>}
