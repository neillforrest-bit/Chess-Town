// Original synthesized ambience. No samples, external audio requests, or paid assets.
export function createCoveAudio(){
 const ctx=new AudioContext(),master=ctx.createGain();master.gain.value=.055;master.connect(ctx.destination);const length=ctx.sampleRate*3,buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0);let previous=0;
 for(let i=0;i<length;i++){const white=Math.random()*2-1;previous=(previous+.02*white)/1.02;data[i]=previous*3.5;}
 const surf=ctx.createBufferSource();surf.buffer=buffer;surf.loop=true;const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;surf.connect(filter);filter.connect(master);surf.start();
 const lfo=ctx.createOscillator(),depth=ctx.createGain();lfo.frequency.value=.12;depth.gain.value=.025;lfo.connect(depth);depth.connect(master.gain);lfo.start();
 const note=(freq:number,when:number,duration:number,type:OscillatorType='sine',volume=.3)=>{const o=ctx.createOscillator(),v=ctx.createGain();o.type=type;o.frequency.value=freq;o.connect(v);v.connect(master);v.gain.setValueAtTime(.001,when);v.gain.exponentialRampToValueAtTime(volume,when+.02);v.gain.exponentialRampToValueAtTime(.001,when+duration);o.start(when);o.stop(when+duration+.05);};
 const interval=setInterval(()=>{if(ctx.state!=='running')return;const n=[392,494,587,659][Math.floor(Math.random()*4)];note(n,ctx.currentTime,.8,'sine',.08);},4200);
 const visibility=()=>{if(document.hidden)void ctx.suspend();else void ctx.resume();};document.addEventListener('visibilitychange',visibility);
 return {putt:()=>note(135,ctx.currentTime,.13,'triangle',.7),bell:()=>[523,659,784,1046].forEach((n,i)=>note(n,ctx.currentTime+i*.12,1.3,'sine',.32)),splash:()=>{filter.frequency.setValueAtTime(1800,ctx.currentTime);filter.frequency.exponentialRampToValueAtTime(650,ctx.currentTime+.8);},close:()=>{clearInterval(interval);document.removeEventListener('visibilitychange',visibility);void ctx.close();}};
}
