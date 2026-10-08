"use client";
import dynamic from "next/dynamic";
const RideApp=dynamic(()=>import("../components/RideApp"),{ssr:false});
export default function P(){return <RideApp/>}
