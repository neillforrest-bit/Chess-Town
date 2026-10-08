"use client";
import {MapContainer,TileLayer,Marker,Polyline,useMap} from "react-leaflet";
import L from "leaflet";
import {useEffect} from "react";
import {LatLng} from "../lib/data";
const pin=(c:string,l:string)=>L.divIcon({className:"pin-icon",iconSize:[60,44],iconAnchor:[30,44],html:`<div style="display:flex;flex-direction:column;align-items:center"><div style="background:${c};color:#fff;font:700 11px sans-serif;padding:3px 8px;border-radius:10px">${l}</div><div style="width:4px;height:12px;background:${c}"></div><div style="width:10px;height:10px;border-radius:5px;background:${c};margin-top:-2px"></div></div>`});
const car=L.divIcon({className:"car-icon",iconSize:[36,36],iconAnchor:[18,18],html:`<div style="width:36px;height:36px;border-radius:18px;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 8px #0008">🚗</div>`});
function Fit({a,b,center,tick,pad}:{a:LatLng;b?:LatLng|null;center:LatLng;tick:number;pad:number}){const m=useMap();
useEffect(()=>{if(b){m.fitBounds(L.latLngBounds([a.lat,a.lng],[b.lat,b.lng]),{paddingTopLeft:[40,40],paddingBottomRight:[40,pad],animate:true})}else m.setView([center.lat,center.lng],15,{animate:true})},[b?.lat,b?.lng,tick,center.lat,center.lng,pad]);return null}
export default function Map({pickup,dest,carPos,tick,pad}:{pickup:LatLng;dest:LatLng|null;carPos:LatLng|null;tick:number;pad:number}){
return <MapContainer center={[pickup.lat,pickup.lng]} zoom={15} zoomControl={false} attributionControl={true} style={{height:"100%",width:"100%"}}>
<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors"/>
<Fit a={pickup} b={dest} center={pickup} tick={tick} pad={pad}/>
<Marker position={[pickup.lat,pickup.lng]} icon={pin("#16a34a","Pickup")}/>
{dest&&<Marker position={[dest.lat,dest.lng]} icon={pin("#dc2626","Drop-off")}/>}
{dest&&<Polyline positions={[[pickup.lat,pickup.lng],[dest.lat,dest.lng]]} pathOptions={{color:"#111",weight:4,dashArray:"2 8"}}/>}
{carPos&&<Marker position={[carPos.lat,carPos.lng]} icon={car} zIndexOffset={1000}/>}
</MapContainer>}
