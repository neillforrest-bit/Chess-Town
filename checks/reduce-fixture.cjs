require('./recovered-knockout.cjs');const G=require('../src/lib/game.ts'),fs=require('fs');let d=JSON.parse(fs.readFileSync(0,'utf8'));console.log(JSON.stringify(G.reduce(d.state,d.it)));
