import titles from './titles.json';
export type ScreenFormat='films'|'series'|'documentaries';
export type TitleRecord={id:string;format:string;title:string;year:number|null;subtype:string;genres:string[];pitch:string;clue:string;source:{provider:string;externalId:string;url:string;licenceRef:string;attribution:string;retrievedAt:string}};
export const CATALOGUE=titles as TitleRecord[];
export const SCREEN_FORMATS=[{id:'films',label:'Films'},{id:'series',label:'Series'},{id:'documentaries',label:'Documentaries'}] as const;
export function screenFormat(value:string|null):ScreenFormat{return value==='series'||value==='documentaries'?value:'films'}
export const MODES={series:[['battle','Pilot Fight','Four shows. One sofa. Argue your way to a winner.'],['quiz','Cold Open','One clue. Can you name the series?'],['shelf','Your next episodes','A separate shelf for your next obsession.']],documentaries:[['dive','Rabbit Hole','Follow your curiosity, one true story at a time.'],['quiz','Time Machine','Two documentaries. Which arrived first?'],['shelf','Field notes','Keep the stories you want to explore.']]} as const;
