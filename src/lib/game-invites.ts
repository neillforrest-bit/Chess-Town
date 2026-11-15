const FILM_ORIGIN='https://chess-town-git-instinct-find-our-film-20261113-neillo.vercel.app';
/** Parse guest invitations only. Never carry a host role into a pasted invite. */
export function guestInvitePath(text:string,origin:string,game:'logic'|'trivia'):string|null{
 const value=text.trim();
 if(/^https:\/\//i.test(value)){
  try{
   const u=new URL(value),durable=u.searchParams.get('durable')==='1'?'&durable=1':'',id=u.searchParams.get('room'),match=u.searchParams.get('match');
   if(u.origin===origin){
    if(u.pathname==='/logic-brawl'&&id&&/^[a-z0-9]{6,24}$/i.test(id))return '/logic-brawl?room='+encodeURIComponent(id.toLowerCase())+durable;
    if(u.pathname==='/haywire'&&id&&/^[a-f0-9-]{36}$/i.test(id))return '/haywire?room='+encodeURIComponent(id)+durable;
    if(u.pathname==='/trivia-brawl'&&match&&/^[a-z0-9]{6,24}$/i.test(match))return '/trivia-brawl?match='+encodeURIComponent(match)+'&role=p2'+durable;
    if(u.pathname==='/trivia-party'&&id&&/^[a-z0-9]{8,24}$/i.test(id))return '/trivia-party?room='+encodeURIComponent(id)+durable;
    if(u.pathname==='/play-checkers'&&u.searchParams.get('mode')==='duel'&&id&&/^[a-z0-9-]{1,24}$/i.test(id))return '/play-checkers?mode=duel&room='+encodeURIComponent(id)+durable;
    if(u.pathname==='/play-chester'&&u.searchParams.get('mode')==='duel'&&id&&/^[a-z0-9-]{1,24}$/i.test(id))return '/play-chester?mode=duel&room='+encodeURIComponent(id)+durable+(u.searchParams.get('war')==='1'?'&war=1':'')+(/^\d{1,4}$/.test(u.searchParams.get('clock')||'')?'&clock='+u.searchParams.get('clock'):'');
    if(/^\/battle\/[a-z0-9-]{6,24}$/i.test(u.pathname))return u.pathname+(durable?'?durable=1':'');
   }
   if(u.origin===FILM_ORIGIN&&/^\/find\/[a-z0-9]+$/i.test(u.pathname))return '/movie/find?invite='+encodeURIComponent(u.href);
  }catch{}
  return null;
 }
 if(/^[a-z0-9]{6,24}$/i.test(value))return game==='logic'?'/logic-brawl?room='+encodeURIComponent(value.toLowerCase()):'/trivia-brawl?match='+encodeURIComponent(value)+'&role=p2';
 return null;
}
