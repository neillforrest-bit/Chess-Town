export const TOWN_NAMES={dinner:'Dinner Town',chess:'Chess Town',trivia:'Trivia Town',logic:'Logic Town',movie:'Movie Town',checkers:'Checkers'};
export type TownKey=keyof typeof TOWN_NAMES;
export const townHref=(town:TownKey)=>`/?choose=mode&town=${town}`;
export function townForPath(path:string):TownKey{
 if(/^\/weekend-cup/.test(path))return 'trivia';
 if(/^\/dinner/.test(path))return 'dinner';
 if(/checkers/.test(path))return 'checkers';
 if(/^\/movie(?:\/|$)/.test(path))return 'movie';
 if(/logic|haywire/.test(path))return 'logic';
 if(/^\/(trivia|quiz)/.test(path)||path==='/road/trivia')return 'trivia';
 return 'chess';
}
