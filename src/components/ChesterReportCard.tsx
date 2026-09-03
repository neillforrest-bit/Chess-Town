'use client';

export type GradedMove = {
  move: string;
  player: string;
  ply: number;
  grade: 'A' | 'B' | 'C' | 'F';
  centipawnLoss: number | null;
};

export function getGpa(grades: GradedMove[]) {
  if (!grades.length) return 0;
  const points = { A: 4, B: 3, C: 2, F: 0 };
  return Number((grades.reduce((total, entry) => total + points[entry.grade], 0) / grades.length).toFixed(2));
}

export default function ChesterReportCard({
  grades,
  review,
  isLoading,
  onClose,
}: {
  grades: GradedMove[];
  review: string;
  isLoading: boolean;
  onClose: () => void;
}) {
  const gpa = getGpa(grades);
  return <div className="chester-report-modal" role="dialog" aria-modal="true" aria-labelledby="chester-report-title">
    <div className="chester-report-modal__backdrop" onClick={onClose} />
    <section className="chester-report-card">
      <header><span>CHESTER'S FINAL VERDICT</span><button type="button" onClick={onClose} aria-label="Close report">×</button></header>
      <h2 id="chester-report-title">REPORT CARD</h2>
      <div className="chester-report-card__gpa"><span>GPA</span><b>{gpa.toFixed(2)}</b><small>/ 4.00</small></div>
      <div className="chester-report-card__grades" aria-label="Move grades">
        {grades.map((entry) => <span key={`${entry.ply}-${entry.move}`} data-grade={entry.grade}>{entry.ply}. {entry.move} <b>{entry.grade}</b></span>)}
      </div>
      <p>{isLoading ? 'Chester is writing his final review...' : review}</p>
    </section>
  </div>;
}
