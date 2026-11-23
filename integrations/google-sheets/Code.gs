/**
 * MOOC Solat Mercu Kejayaan — Google Sheets webhook (Apps Script).
 *
 * LANGKAH:
 * 1. Buka Google Sheet: https://docs.google.com/spreadsheets/d/1w510h2dkCr72RSBookGYRlAWUY5HGtgDHvjBEXrhLtY
 * 2. Extensions → Apps Script → tampal fail ini dalam Code.gs.
 * 3. Jalankan fungsi `setup` sekali (Run → setup). Lihat Execution log untuk WEBHOOK_SECRET.
 * 4. Deploy → New deployment → Web app:
 *      Execute as: Me
 *      Who has access: Anyone
 *    Salin URL /exec.
 * 5. Di panel admin MOOC → Tetapan Sheet: masukkan URL + secret, kemudian Sync semua.
 */

const SHEET_ID = "1w510h2dkCr72RSBookGYRlAWUY5HGtgDHvjBEXrhLtY";

const HEADERS = {
  Pelajar: [
    "Emel",
    "Nama Penuh",
    "Kelas",
    "Profil Lengkap",
    "Modul Selesai",
    "Jumlah Modul",
    "Markah Akhir",
    "Jumlah Soalan",
    "Peratus",
    "Masa (saat)",
    "Kedudukan",
    "No. Sijil",
    "Tarikh Hantar",
    "Dikemas Kini",
  ],
  Keputusan: [
    "ID",
    "Jenis",
    "Emel",
    "Nama",
    "Kelas",
    "Kuiz / Pentaksiran",
    "Betul",
    "Jumlah",
    "Peratus",
    "Lulus",
    "Masa (saat)",
    "Tarikh",
  ],
  Sijil: ["No. Sijil", "Emel", "Nama", "Kelas", "Markah", "Jumlah", "Masa (saat)", "Tarikh"],
  Ranking: ["Rank", "Nama", "Kelas", "Betul", "Jumlah", "Peratus", "Masa (saat)", "Tarikh"],
};

function setup() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  Object.keys(HEADERS).forEach((name) => ensureSheet_(ss, name));
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty("WEBHOOK_SECRET");
  if (!secret) {
    secret = Utilities.getUuid();
    props.setProperty("WEBHOOK_SECRET", secret);
  }
  Logger.log("WEBHOOK_SECRET: " + secret);
  Logger.log("Sheet sedia digunakan: " + SHEET_ID);
}

function doGet() {
  return json_({ ok: true, message: "Webhook MOOC Solat Mercu Kejayaan aktif" });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const body = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET");
    if (!secret || body.secret !== secret) {
      return json_({ ok: false, error: "Secret tidak sah" });
    }
    const ss = SpreadsheetApp.openById(SHEET_ID);
    switch (body.event) {
      case "PROFILE_UPDATED":
        handleProfile_(ss, body.payload);
        break;
      case "QUIZ_ATTEMPT":
        handleQuiz_(ss, body.payload);
        break;
      case "FINAL_SUBMITTED":
        handleFinal_(ss, body.payload);
        break;
      case "FULL_SYNC":
        handleFullSync_(ss, body.payload);
        break;
      default:
        return json_({ ok: false, error: "Event tidak dikenali: " + body.event });
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try {
      lock.releaseLock();
    } catch (ignore) {}
  }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------
function handleProfile_(ss, p) {
  const sheet = ensureSheet_(ss, "Pelajar");
  const row = [
    p.email || "",
    p.student_name || "",
    p.class_name || "",
    p.profile_completed ? "YA" : "TIDAK",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    formatDate_(p.updated_at),
  ];
  upsertRow_(sheet, 1, p.email || "", row);
}

function handleQuiz_(ss, p) {
  const sheet = ensureSheet_(ss, "Keputusan");
  const row = [
    p.attempt_id || "",
    "KUIZ MODUL",
    p.email || "",
    p.student_name || "",
    p.class_name || "",
    p.quiz_title || p.quiz_id || "",
    number_(p.score),
    number_(p.total),
    number_(p.percentage),
    p.passed ? "YA" : "TIDAK",
    "",
    formatDate_(p.completed_at),
  ];
  upsertRow_(sheet, 1, p.attempt_id || "", row);
}

function handleFinal_(ss, p) {
  // 1. Snapshot pelajar
  const students = ensureSheet_(ss, "Pelajar");
  const studentRow = [
    p.email || "",
    p.student_name || "",
    p.class_name || "",
    "YA",
    "7",
    "7",
    number_(p.score),
    number_(p.total),
    number_(p.percentage),
    number_(p.duration_seconds),
    number_(p.rank),
    p.certificate_number || "",
    formatDate_(p.submitted_at),
    formatDate_(p.submitted_at),
  ];
  upsertRow_(students, 1, p.email || "", studentRow);

  // 2. Keputusan
  const results = ensureSheet_(ss, "Keputusan");
  const resultRow = [
    "final-" + (p.student_id || p.email || ""),
    "PENTAKSIRAN AKHIR",
    p.email || "",
    p.student_name || "",
    p.class_name || "",
    "Pentaksiran Akhir",
    number_(p.score),
    number_(p.total),
    number_(p.percentage),
    "SELESAI",
    number_(p.duration_seconds),
    formatDate_(p.submitted_at),
  ];
  upsertRow_(results, 1, "final-" + (p.student_id || p.email || ""), resultRow);

  // 3. Sijil
  if (p.certificate_number) {
    const certs = ensureSheet_(ss, "Sijil");
    const certRow = [
      p.certificate_number,
      p.email || "",
      p.student_name || "",
      p.class_name || "",
      number_(p.score),
      number_(p.total),
      number_(p.duration_seconds),
      formatDate_(p.submitted_at),
    ];
    upsertRow_(certs, 1, p.certificate_number, certRow);
  }

  // 4. Ranking
  rebuildRankingFromResults_(ss);
}

function handleFullSync_(ss, p) {
  const students = ensureSheet_(ss, "Pelajar");
  const results = ensureSheet_(ss, "Keputusan");
  const certs = ensureSheet_(ss, "Sijil");
  const ranking = ensureSheet_(ss, "Ranking");

  const studentRows = (p.students || []).map((s) => [
    s.email || "",
    s.full_name || "",
    s.class_name || "",
    s.profile_completed ? "YA" : "TIDAK",
    number_(s.completed_lessons),
    number_(s.total_lessons),
    s.final_score == null ? "" : number_(s.final_score),
    s.final_total == null ? "" : number_(s.final_total),
    s.final_score != null && s.final_total ? Math.round((s.final_score / s.final_total) * 100) : "",
    s.final_duration == null ? "" : number_(s.final_duration),
    "",
    s.certificate_number || "",
    formatDate_(s.final_submitted_at),
    formatDate_(new Date().toISOString()),
  ]);
  clearAndWrite_(students, HEADERS.Pelajar, studentRows);

  const resultRows = [];
  (p.module_attempts || []).forEach((a) => {
    resultRows.push([
      a.id || "",
      "KUIZ MODUL",
      "",
      a.student_name || "",
      a.class_name || "",
      a.quiz_id || "",
      number_(a.score),
      number_(a.total),
      number_(a.percentage),
      a.passed ? "YA" : "TIDAK",
      "",
      formatDate_(a.completed_at),
    ]);
  });
  (p.final_attempts || []).forEach((a) => {
    resultRows.push([
      "final-" + (a.student_id || ""),
      "PENTAKSIRAN AKHIR",
      "",
      a.student_name || "",
      a.class_name || "",
      "Pentaksiran Akhir",
      number_(a.score),
      number_(a.total),
      number_(a.percentage),
      "SELESAI",
      number_(a.duration_seconds),
      formatDate_(a.submitted_at),
    ]);
  });
  clearAndWrite_(results, HEADERS.Keputusan, resultRows);

  const certRows = (p.certificates || []).map((c) => [
    c.certificate_number || "",
    c.email || "",
    c.student_name || "",
    c.class_name || "",
    c.score == null ? "" : number_(c.score),
    c.total == null ? "" : number_(c.total),
    c.duration_seconds == null ? "" : number_(c.duration_seconds),
    formatDate_(c.issued_at),
  ]);
  clearAndWrite_(certs, HEADERS.Sijil, certRows);

  const rankingRows = (p.ranking || []).map((r) => [
    number_(r.rank),
    r.full_name || "",
    r.class_name || "",
    number_(r.score),
    number_(r.total),
    number_(r.percentage),
    number_(r.duration_seconds),
    formatDate_(r.submitted_at),
  ]);
  clearAndWrite_(ranking, HEADERS.Ranking, rankingRows);
}

function rebuildRankingFromResults_(ss) {
  const results = ensureSheet_(ss, "Keputusan");
  const last = results.getLastRow();
  if (last < 2) {
    clearAndWrite_(ensureSheet_(ss, "Ranking"), HEADERS.Ranking, []);
    return;
  }
  const values = results.getRange(2, 1, last - 1, HEADERS.Keputusan.length).getValues();
  const finals = values
    .filter((r) => String(r[1]) === "PENTAKSIRAN AKHIR")
    .map((r) => ({
      name: r[3] || "",
      className: r[4] || "",
      score: Number(r[6]) || 0,
      total: Number(r[7]) || 0,
      pct: Number(r[8]) || 0,
      duration: Number(r[10]) || 0,
      date: String(r[11] || ""),
    }))
    .sort((a, b) => b.score - a.score || a.duration - b.duration || a.date.localeCompare(b.date));

  const rows = finals.map((r, i) => [
    i + 1,
    r.name,
    r.className,
    r.score,
    r.total,
    r.pct,
    r.duration,
    r.date,
  ]);
  clearAndWrite_(ensureSheet_(ss, "Ranking"), HEADERS.Ranking, rows);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ensureSheet_(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  const headers = HEADERS[name];
  if (!headers) throw new Error("Tab tidak dikenali: " + name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0b7a70").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function upsertRow_(sheet, keyColumn, key, row) {
  if (!key) {
    sheet.appendRow(row);
    return;
  }
  const last = sheet.getLastRow();
  if (last > 1) {
    const keys = sheet.getRange(2, keyColumn, last - 1, 1).getValues().flat();
    const idx = keys.findIndex((k) => String(k) === String(key));
    if (idx >= 0) {
      sheet.getRange(idx + 2, 1, 1, row.length).setValues([row]);
      return;
    }
  }
  sheet.appendRow(row);
}

function clearAndWrite_(sheet, headers, rows) {
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0b7a70").setFontColor("#ffffff");
  sheet.setFrozenRows(1);
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function formatDate_(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return Utilities.formatDate(d, "Asia/Kuala_Lumpur", "dd/MM/yyyy HH:mm");
}

function number_(v) {
  return v == null || v === "" ? "" : Number(v);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
