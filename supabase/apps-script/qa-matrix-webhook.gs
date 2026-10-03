/**
 * Chess-Town QA matrix webhook.
 * Receives a qa_logs row (from a Supabase Database Webhook on INSERT, or any JSON POST) and
 * appends one line to the first tab of the Google Sheet this script is attached to.
 *
 * SETUP: open the Sheet > Extensions > Apps Script, paste this, set SECRET below, Deploy > New deployment >
 * Web app > Execute as: Me, Who has access: Anyone > Deploy, and copy the /exec URL.
 */
const SECRET = 'CHANGE-ME-to-a-long-random-word'; // the webhook URL must end with ?key=<this same value>
const SHEET_ID = '';                              // leave '' when the script is attached to the Sheet (recommended)
const HEADERS = ['Timestamp', 'Match ID', 'Move Number', 'FEN', 'Accuracy %', 'Gemini Output', 'Input Tokens', 'Output Tokens', 'Estimated Cost (USD)'];

function doPost(e) {
  try {
    if (!e || !e.parameter || e.parameter.key !== SECRET) return reply_({ ok: false, error: 'unauthorized' });
    const body = JSON.parse(e.postData.contents);
    const row = body.record || body; // Supabase webhooks wrap the row in "record"
    const cpl = Number(row.stockfish_cpl);
    // Exponential decay: 0 cp lost = 100%, 100 cp = 61%, 300 cp = 22%
    const accuracy = Number.isFinite(cpl) ? Math.round(100 * Math.exp(-0.005 * Math.abs(cpl))) : '';
    const sheet = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID).getSheets()[0] : SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
    sheet.appendRow([
      row.created_at ? new Date(row.created_at) : new Date(),
      row.match_id || '',
      row.move_number === null || row.move_number === undefined ? '' : row.move_number,
      row.current_fen || '',
      accuracy,
      row.gemini_output || '',
      row.input_tokens || 0,
      row.output_tokens || 0,
      row.estimated_cost_usd || 0,
    ]);
    return reply_({ ok: true, accuracy: accuracy });
  } catch (err) {
    return reply_({ ok: false, error: String(err) });
  }
}

function doGet() { return reply_({ ok: true, hint: 'POST a qa_logs row here' }); }
function reply_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
