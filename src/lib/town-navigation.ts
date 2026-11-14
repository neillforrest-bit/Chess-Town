export const TOWN_NAMES={chess:'Chess Town',trivia:'Trivia Town',logic:'Logic Town',movie:'Movie Town',checkers:'Checkers'};
export type TownKey=keyof typeof TOWN_NAMES;
export const townHref=(town:TownKey)=>`/?choose=mode&town=${town}`;
export function townForPath(path:string):TownKey{
 if(/checkers/.test(path))return 'checkers';
 if(/^\/movie(?:\/|$)/.test(path))return 'movie';
 if(/logic/.test(path))return 'logic';
 if(/^\/(trivia|quiz)/.test(path)||path==='/road/trivia')return 'trivia';
 return 'chess';
}
