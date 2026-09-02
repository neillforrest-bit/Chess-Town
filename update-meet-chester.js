const fs = require('fs');
let code = fs.readFileSync('src/app/meet-chester/page.tsx', 'utf-8');

const floatingPieces = `
      {/* Background Floating Chess Theme */}
      <div className="floating-chess-piece" style={{ left: '10%', animationDelay: '0s' }}>♞</div>
      <div className="floating-chess-piece" style={{ left: '85%', animationDelay: '2s' }}>♚</div>
      <div className="floating-chess-piece" style={{ left: '25%', animationDelay: '5s' }}>♛</div>
      <div className="floating-chess-piece" style={{ left: '70%', animationDelay: '7s' }}>♝</div>
      <div className="floating-chess-piece" style={{ left: '40%', animationDelay: '10s' }}>♜</div>
      <div className="floating-chess-piece" style={{ left: '60%', animationDelay: '12s' }}>♞</div>
`;

code = code.replace(/<div style=\{\{\s*display: 'flex',[\s\S]*?\}\}>\s*/, (match) => {
  return match + floatingPieces;
});

fs.writeFileSync('src/app/meet-chester/page.tsx', code);
