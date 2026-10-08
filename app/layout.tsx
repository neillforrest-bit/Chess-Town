import "./globals.css";
import "leaflet/dist/leaflet.css";
export const metadata={title:"London Ride"};
export const viewport={width:"device-width",initialScale:1,maximumScale:1,userScalable:false};
export default function L({children}:{children:React.ReactNode}){return <html lang="en"><body className="bg-neutral-900">{children}</body></html>}
