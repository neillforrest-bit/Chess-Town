import type { Movie, PID } from '../game';
export type KindNight = 'any' | 'blockbuster' | 'indie' | 'gem' | 'classic';
export type MoodNight = 'open' | 'light' | 'tense' | 'thoughtful' | 'adventure';
export type Brief = { kind: KindNight; mood: MoodNight; genres: string[]; exclude: string[]; actors: string[]; requireActor: boolean; ready: boolean };
export type FindMovie = Movie & { budget?: number; revenue?:number; lang?: string; source?: string; why?: string[]; lane?: 'fit' | 'gem' | 'stretch'; creditsChecked?: boolean };
export type Slice = { id: string; name: string; description: string; ids: number[] };
export type Opinion = 'want' | 'maybe' | 'pass' | 'seen';
export type LoungeBid={id:number|null;tokens:number;locked:boolean;double:boolean};
export type Lounge={stage:'choose'|'bout'|'result';ids:number[];pair:[number,number]|null;by:PID;bank:Record<PID,number>;bids:Record<PID,LoungeBid>;wild:Record<PID,{double:boolean;steal:boolean;swap:boolean;timeout:boolean}>;endsAt:number;pauseUntil:number;history:{pair:[number,number];winner:number|null;A:number;B:number}[];winner:number|null;event:string;eventN:number;lowSaid?:boolean;lead?:number|null;leadChanged?:boolean;nextReady?:Record<PID,boolean>};
export type FindState = {
 flow: 'find-v1'; code: string; v: number; createdAt: number; updatedAt: number;
 phase: 'lobby' | 'brief' | 'wheel' | 'cards' | 'nominate' | 'accept' | 'showdown' | 'lounge' | 'confirm' | 'done';
 players: Record<PID, { name: string; joined: boolean; ready: boolean; tokenHash: string; playerId?: string }>;
 inviteHash: string; brief: Record<PID, Brief>; slices: Slice[]; wheel: { turn: PID; veto: Record<PID, boolean>; rejected: string[]; result: string | null; spunAt: number; spinCount: number; accepted: Record<PID, boolean>; rounds?: 4; kept?: string[]; gold?: Record<PID,boolean>; protected?: boolean; version?: 'genres-v2'; setup?: 'protect'|'veto'|'spin'; protectPick?: Record<PID,string|null>; protectDone?: Record<PID,boolean>; vetoPicks?: Record<PID,string[]>; vetoDone?: Record<PID,boolean> };
 movies: FindMovie[]; pool: number[]; opinions: Record<PID, Record<number, Opinion>>; saved: Record<PID, number[]>; finished: Record<PID, boolean>;
 nominations: Record<PID, number[]>; nominationDone: Record<PID, boolean>; acceptance: Record<PID, Record<number, boolean>>; acceptanceDone: Record<PID, boolean>;
 finalists: number[]; bout: { a: number; b: number; votes: Partial<Record<PID, number | 'either'>> } | null; champion: number | null; confirmed: Record<PID, boolean>;
 line: string; issue: string | null; trace: string[]; searchNotes?:string[]; cost: { calls: number; usd: number }; batch: number; actionReceipts?: Record<string, number>; lounge?: Lounge;
};
export type PublicFindState = Omit<FindState, 'inviteHash'>;
export type Action = ({round?:number;stage?:string}) & (
 | { t: 'join'; name: string } | { t: 'ready'; ready: boolean }
 | { t: 'brief'; brief: Brief } | { t: 'editBrief' } | { t: 'spin'; count?: number } | { t: 'veto' } | { t: 'keepSlice' } | { t: 'goldSlice' } | { t: 'upgradeWheel' } | { t: 'protectGenre'; id: string|null; done: boolean } | { t: 'vetoGenres'; ids: string[]; done: boolean }
 | { t: 'opinion'; id: number; value: Opinion } | { t: 'save'; id: number; save: boolean } | { t: 'finishCards' }
 | { t: 'nominate'; ids: number[]; done: boolean } | { t: 'accept'; ids: number[]; done: boolean }
 | {t:'openLounge'} | {t:'loungePair';ids:number[]} | {t:'loungeBid';id:number;tokens:number} | {t:'loungeLock'} | {t:'loungeWild';kind:'double'|'steal'|'swap'|'timeout'} | {t:'loungeNext'} | {t:'loungePropose';id:number}
 | { t: 'vote'; id: number | 'either' } | { t: 'agreeBout'; id: number } | { t: 'confirm'; yes: boolean } | { t: 'reopen' });
export const emptyBrief = (): Brief => ({ kind: 'any', mood: 'open', genres: [], exclude: [], actors: [], requireActor: false, ready: false });
export function newFind(code: string, inviteHash: string): FindState {
 return { flow:'find-v1',code,v:0,createdAt:Date.now(),updatedAt:Date.now(),phase:'lobby',players:{A:{name:'Player 1',joined:false,ready:false,tokenHash:''},B:{name:'Player 2',joined:false,ready:false,tokenHash:''}},inviteHash,brief:{A:emptyBrief(),B:emptyBrief()},slices:[],wheel:{turn:'A',veto:{A:true,B:true},rejected:[],result:null,spunAt:0,spinCount:0,accepted:{A:false,B:false},rounds:4,kept:[],gold:{A:true,B:true},protected:false},movies:[],pool:[],opinions:{A:{},B:{}},saved:{A:[],B:[]},finished:{A:false,B:false},nominations:{A:[],B:[]},nominationDone:{A:false,B:false},acceptance:{A:{},B:{}},acceptanceDone:{A:false,B:false},finalists:[],bout:null,champion:null,confirmed:{A:false,B:false},line:'Two people. One film you actually want. A modest ambition. I believe in you.',issue:null,trace:[],cost:{calls:0,usd:0},batch:0 };
}
