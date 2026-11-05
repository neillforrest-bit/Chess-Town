import type { Puzzle } from './bank';
export function generatedPuzzles():Puzzle[]{
 const out:Puzzle[]=[];const add=(id:string,category:string,difficulty:number,prompt:string,correct:string,wrong:string[],explanation:string)=>out.push({id,category,difficulty,prompt,correct,options:[correct,...wrong],explanation});
 for(let n=1;n<=40;n++){
 const side=n+3;add(`geo${n}`,'Number Lab',n%3+1,`A square has side ${side}. What is its perimeter?`,`${4*side}`,[`${side*side+1}`,`${2*side}`,`${4*side+2}`],`Four equal sides:4 × ${side} = ${4*side}.`);
 const blue=n%5+2,red=n%7+2;add(`draw${n}`,'Number Lab',2,`A bag has ${blue} blue and ${red} red stones. Drawing unseen without replacement, how many guarantee a red?`,`${blue+1}`,[`${blue}`,`${red}`,`${blue+red+1}`].filter((x,i,a)=>a.indexOf(x)===i&&x!==`${blue+1}`).concat([`${blue+red+3}`,`${blue+red+4}`]).slice(0,3),`The worst case draws all ${blue} blue stones first. The next stone must be red.`);
 const a=n+1;add(`diff${n}`,'Pattern Alley',2,`Add successive even numbers: ${a}, ${a+2}, ${a+6}, ${a+12}, ?`,`${a+20}`,[`${a+18}`,`${a+22}`,`${a+24}`],`Differences are2,4,6; next add8 to get ${a+20}.`);
 const b=n%8+2;add(`alt${n}`,'Pattern Alley',3,`Alternate +${b} then ×2: ${a}, ${a+b}, ${(a+b)*2}, ${(a+b)*2+b}, ?`,`${((a+b)*2+b)*2}`,[`${((a+b)*2+b)*2+1}`,`${(a+b)*2+2*b}`,`${((a+b)*2+b)*2-1}`],`The next operation is ×2: ${(a+b)*2+b} ×2 = ${((a+b)*2+b)*2}.`);
 const x=n%6+2,y=n%5+3;add(`grid${n}`,'Deduction Den',3,`A code uses digits ${x}, ${y===x?y+1:y}, 9 once each, greatest first. What is it?`,[x,y===x?y+1:y,9].sort((a,b)=>b-a).join(''),[`${x}${y===x?y+1:y}9`,`${x}9${y===x?y+1:y}`,`9${Math.min(x,y===x?y+1:y)}${Math.max(x,y===x?y+1:y)}`],`Sort the three stated digits from greatest to least.`);
 }
 return out.filter(q=>q.options.length===4&&new Set(q.options).size===4);
}
