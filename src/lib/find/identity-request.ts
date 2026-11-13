// Retry transient transport/storage failures only. A claim retries with the same
// pending credential, which the server resolves before any new claim is made.
export async function identityRequest(init:RequestInit={}){
 for(let attempt=0;attempt<2;attempt++){
  try{const r=await fetch('/api/find-identity',{...init,cache:'no-store',signal:AbortSignal.timeout(12000)});const d=await r.json();if(!r.ok){if(r.status>=500&&attempt===0){await new Promise(r=>setTimeout(r,350));continue;}throw Error(d.error||'Could not check your username. Please retry.');}return d;}
  catch(e){if(attempt===0&&e instanceof Error&&['TypeError','TimeoutError','AbortError','SyntaxError'].includes(e.name)){await new Promise(r=>setTimeout(r,350));continue;}throw e;}
 }
 throw Error('Could not check your username. Please retry.');
}
