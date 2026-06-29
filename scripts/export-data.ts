import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import ws from 'ws';

const envPath = path.join(__dirname, '../.env.local');
const envFallback = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else if (fs.existsSync(envFallback)) {
  dotenv.config({ path: envFallback });
} else {
  console.error('No .env or .env.local found');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { realtime: { transport: ws as any } }
);

const OUTPUT_DIR = path.join(__dirname, '../data');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function flattenValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (Array.isArray(val)) return val.join(' | ');
  return String(val);
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = rows.map(row =>
    headers.map(h => {
      const str = flattenValue(row[h]);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }).join(',')
  );
  return [headers.join(','), ...lines].join('\n');
}

async function fetchTable(table: string): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  let from = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`);
    if (!data?.length) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

function groupResponsesBySubmission(rows: Record<string, unknown>[]) {
  const map = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const sid = row.submission_id as string;
    if (!map.has(sid)) map.set(sid, []);
    map.get(sid)!.push(row);
  }
  return Array.from(map.entries())
    .map(([submission_id, answers]) => {
      const first = answers[0];
      return {
        submission_id,
        email: first.email ?? null,
        submitted_at: first.submitted_at ?? null,
        answer_count: answers.length,
        answers: answers.map(a => ({
          section_key: a.section_key,
          section_name: a.section_name,
          question_key: a.question_key,
          question_text: a.question_text,
          answer: a.answer,
          remark: a.remark ?? null,
        })),
      };
    })
    .sort((a, b) =>
      String(a.submitted_at ?? '').localeCompare(String(b.submitted_at ?? ''))
    );
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const nowISO = new Date().toISOString();

  console.log('Exporting data from Supabase...\n');

  process.stdout.write('  tokens... ');
  const tokens = await fetchTable('tokens');
  console.log(`${tokens.length} rows`);

  process.stdout.write('  responses... ');
  const responses = await fetchTable('responses');
  console.log(`${responses.length} rows`);

  process.stdout.write('  emails... ');
  const emails = await fetchTable('emails');
  console.log(`${emails.length} rows`);

  const submissionIds = new Set(responses.map(r => r.submission_id as string));
  const submittedTokens = tokens.filter(t => t.submitted === true).length;

  // --- CSV: individual tables ---
  const csvOuts = [
    { name: 'tokens.csv', rows: tokens },
    { name: 'responses.csv', rows: responses },
    { name: 'emails.csv', rows: emails },
  ];
  for (const { name, rows } of csvOuts) {
    const fp = path.join(OUTPUT_DIR, name);
    fs.writeFileSync(fp, toCSV(rows), 'utf-8');
    console.log(`  → data/${name}`);
  }

  // --- JSON: structured export ---
  const structured = {
    metadata: {
      exported_at: nowISO,
      table_counts: {
        tokens: tokens.length,
        responses: responses.length,
        emails: emails.length,
      },
      summary: {
        total_submissions: submissionIds.size,
        tokens_sent: tokens.filter(t => t.email_sent === true).length,
        tokens_pending: tokens.filter(t => t.email_sent === false).length,
        tokens_submitted: submittedTokens,
        tokens_not_submitted: tokens.length - submittedTokens,
        emails_responded: emails.filter(e => e.submitted === true).length,
        emails_pending: emails.filter(e => e.submitted === false).length,
      },
    },
    submissions: groupResponsesBySubmission(responses),
    tokens,
    emails,
  };

  const jsonPath = path.join(OUTPUT_DIR, `export-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(structured, null, 2), 'utf-8');
  console.log(`  → data/export-${timestamp}.json`);

  const latestJsonPath = path.join(OUTPUT_DIR, 'export-latest.json');
  fs.writeFileSync(latestJsonPath, JSON.stringify(structured, null, 2), 'utf-8');
  console.log(`  → data/export-latest.json`);

  // --- Summary CSV (human-readable overview) ---
  const summary = [
    `=== Export Summary ===`,
    `Exported at: ${nowISO}`,
    `Total tokens: ${tokens.length}`,
    `Total responses: ${responses.length} (${submissionIds.size} submissions)`,
    `Total emails: ${emails.length}`,
    `Tokens sent: ${structured.metadata.summary.tokens_sent}`,
    `Tokens submitted: ${submittedTokens}`,
    ``,
    `=== Submissions Overview ===`,
    `submission_id,email,submitted_at,answer_count`,
    ...structured.submissions.map(s =>
      `${s.submission_id},${s.email ?? ''},${s.submitted_at ?? ''},${s.answer_count}`
    ),
  ].join('\n');

  const summaryPath = path.join(OUTPUT_DIR, `export-${timestamp}-summary.txt`);
  fs.writeFileSync(summaryPath, summary, 'utf-8');
  console.log(`  → data/export-${timestamp}-summary.txt`);

  console.log('\n✅ Export complete.');
}

main().catch(err => {
  console.error('\n❌ Export failed:', err);
  process.exit(1);
});
