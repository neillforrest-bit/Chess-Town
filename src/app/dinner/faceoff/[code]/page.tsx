import Faceoff from '@/games/dinner/faceoff/Faceoff';export default async function Page({params}:{params:Promise<{code:string}>}){return <Faceoff code={(await params).code}/>}
