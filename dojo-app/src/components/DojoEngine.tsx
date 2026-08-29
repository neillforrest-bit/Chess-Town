// @ts-nocheck
'use client'; 

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { Chess } from 'chess.js';

const SCRIPTED_ROASTS = [
  "Neill opens with e4! Pure unhinged confidence, like drafting a kicker in Round 3.",
  "Brendan mirrors with e5. Symmetrical warfare! He's looking at Neill like an easy Week 1 matchup.",
  "Neill develops Nf3. Standard play, but his endgame is more questionable than his waiver wire history.",
  "Brendan locks down c6. The League Hero is quietly setting up a tactical ambush.",
  "The Italian Game! Neill places the Bishop on the lethal diagonal.",
  "🚨 THE BLACKBURNE SHILLING GAMBIT! Brendan offers the e5 pawn on a silver platter! It's a trap!",
  "HE TOOK IT! Neill bit on the poisoned pawn! Gabe is in the group chat screaming right now.",
  "Brendan deploys Qg5! Double attack! Neill's defensive secondary is completely torched.",
  "Neill forks Queen and Rook with Nxf7! He thinks he's winning—he has no idea he just stepped into the guillotine!",
  "BOOM! Brendan destroys g2! Neill's h1 Rook is officially on life support!",
  "Neill scrambles with Rf1! Pure panic defense. Smells like a 4th-quarter blowout.",
  "CHECK! Brendan captures the center! Neill is completely suffocating in the pocket.",
  "Neill blocks with Be2. The executioner has taken the field.",
  "👑 SMOTHERED CHECKMATE! Brendan drops the Knight! Neill is headed to the Sacko Bowl!"
];

export default function DojoEngine({ mode = 'STANDBY' }: { mode?: string }) {
  const phaserGameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !phaserGameRef.current) {
      
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO, parent: 'phaser-game-container', backgroundColor: 'transparent', 
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 800, height: 800 },
        input: { activePointers: 3 }, 
        scene: {
          create: function(this: Phaser.Scene) {
            const scene = this; 
            const tileSize = 90; const boardOffset = 40; 
            
            let isFlipped = false; let currentMode = mode; let simInterval: any = null; let lastMoveTo = null; 

            const simulationMoves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4', 'Nxe5', 'Qg5', 'Nxf7', 'Qxg2', 'Rf1', 'Qxe4+', 'Be2', 'Nf3#'];
            const graphics = scene.add.graphics();
            const colNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']; const rowNames = ['8', '7', '6', '5', '4', '3', '2', '1'];
            const coordStyle = { fontSize: '24px', color: '#00ffff', fontFamily: 'Comic Sans MS, sans-serif', fontStyle: 'bold' };
            const chess = new Chess();
            let activePieces: Record<string, Phaser.GameObjects.Container> = {};

            const pieceMap: Record<string, string> = { 'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚', 'P': '♟', 'N': '♞', 'B': '♝', 'R': '♜', 'Q': '♕', 'K': '♔' };
            const unifiedFaces: Record<string, string> = { 'p': '💂‍♂️', 'n': '🦄', 'b': '🧙‍♂️', 'r': '🏰', 'q': '👸', 'k': '🤴', 'P': '💂‍♂️', 'N': '🦄', 'B': '🧙‍♂️', 'R': '🏰', 'Q': '👸', 'K': '🤴' };
            const colToChar = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

            const renderAll = () => {
              if (!scene || !scene.sys || !scene.add) return;
              graphics.clear();
              Object.values(activePieces).forEach(p => { if (p && p.destroy) p.destroy(); });
              activePieces = {};
              const boardState = chess.board();

              for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                  const renderCol = isFlipped ? 7 - col : col; const renderRow = isFlipped ? 7 - row : row;
                  const squareColor = (row + col) % 2 === 0 ? 0x1a0033 : 0x080012; 
                  graphics.fillStyle(squareColor, 1);
                  graphics.fillRect(boardOffset + (renderCol * tileSize), boardOffset + (renderRow * tileSize), tileSize, tileSize);
                  graphics.lineStyle(2, 0x00ffff, 0.3);
                  graphics.strokeRect(boardOffset + (renderCol * tileSize), boardOffset + (renderRow * tileSize), tileSize, tileSize);
                }
              }

              for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                  const square = boardState[row][col];
                  if (square) {
                    const isWhite = square.color === 'w'; const symbol = square.type;
                    const pieceChar = isWhite ? symbol.toUpperCase() : symbol; const squareName = colToChar[col] + rowNames[row];
                    const renderCol = isFlipped ? 7 - col : col; const renderRow = isFlipped ? 7 - row : row;
                    const posX = boardOffset + (renderCol * tileSize) + (tileSize / 2); const posY = boardOffset + (renderRow * tileSize) + (tileSize / 2);

                    const container = scene.add.container(posX, posY); container.setSize(tileSize, tileSize);

                    const isSpotlight = (lastMoveTo === squareName);
                    if (lastMoveTo !== null) container.setAlpha(isSpotlight ? 1.0 : 0.3);
                    if (isSpotlight) {
                      const glow = scene.add.circle(0, 0, tileSize / 1.8, 0x39ff14, 0.6); 
                      scene.tweens.add({ targets: glow, alpha: 0.1, scale: 1.2, yoyo: true, repeat: -1, duration: 600 });
                      container.add(glow); 
                    }

                    const pieceColor = isWhite ? '#39ff14' : '#ff007f';
                    const baseText = scene.add.text(0, 0, pieceMap[pieceChar], { fontFamily: 'Comic Sans MS, sans-serif', fontSize: '70px', color: pieceColor, shadow: { blur: 14, color: pieceColor, fill: true } }).setOrigin(0.5);
                    const faceText = scene.add.text(0, symbol === 'p' ? -2 : -15, unifiedFaces[pieceChar], { fontSize: '40px' }).setOrigin(0.5);
                    container.add([baseText, faceText]);
                    activePieces[squareName] = container;
                  }
                }
              }
            };

            const handleStartDemo = () => {
              if (simInterval) clearInterval(simInterval);
              let step = 0;
              
              window.dispatchEvent(new CustomEvent('dojo-banter', { detail: `🎙️ CHESTER: Uplink established! Match underway...` }));

              simInterval = setInterval(() => {
                if (step >= simulationMoves.length) {
                  clearInterval(simInterval);
                  window.dispatchEvent(new CustomEvent('dojo-banter', { detail: `🏆 MATCH CONCLUDED! ABSOLUTE TACTICAL DEVASTATION ON THE GRID!` }));
                  window.dispatchEvent(new CustomEvent('demo-complete'));
                  return;
                }

                const moveString = simulationMoves[step];
                const moveResult = chess.move(moveString);
                
                if (moveResult) {
                  lastMoveTo = moveResult.to;
                  renderAll();
                  const playerTurn = step % 2 === 0 ? 'Neill' : 'Brendan 🦸‍♂️';
                  const roast = SCRIPTED_ROASTS[step % SCRIPTED_ROASTS.length];
                  window.dispatchEvent(new CustomEvent('dojo-banter', { detail: `▶️ [PLY ${step + 1}] ${playerTurn} played ${moveString}. ${roast}` }));
                }
                step++;
              }, 3500);
            };

            const handleLoadPuzzle = (e: any) => {
              isFlipped = e.detail.isFlipped || false; currentMode = e.detail.mode || 'STANDBY';
              chess.reset(); step = 0; lastMoveTo = null;
              if (simInterval) clearInterval(simInterval);
              if (scene && scene.add) renderAll();
            };

            window.addEventListener('load-puzzle', handleLoadPuzzle);
            window.addEventListener('start-demo', handleStartDemo);

            scene.events.once('destroy', () => { 
              window.removeEventListener('load-puzzle', handleLoadPuzzle); 
              window.removeEventListener('start-demo', handleStartDemo);
              if (simInterval) clearInterval(simInterval);
            });
            
            renderAll();
          }
        }
      };
      phaserGameRef.current = new Phaser.Game(config);
    }
    return () => { if (phaserGameRef.current) { phaserGameRef.current.destroy(true); phaserGameRef.current = null; } };
  }, [mode]); 
  return null; 
}