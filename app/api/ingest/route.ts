import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createReadStream } from "fs";
import { parse } from "csv-parse";
import path from "path";

const CSV_PATH = path.join(process.cwd(), "data", "arckeywords.csv");
const BATCH_SIZE = 1000;

interface CsvRow {
  analytics_date: string;
  keyword: string;
  page_url: string;
  clicks: string;
  impressions: string;
  ctr: string;
  position: string;
}

function ingestCsv(): Promise<number> {
  return new Promise((resolve, reject) => {
    const insert = db.prepare(
      `INSERT INTO gsc (analytics_date, keyword, page_url, clicks, impressions, ctr, position)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    const insertBatch = db.transaction((rows: CsvRow[]) => {
      for (const row of rows) {
        insert.run(
          row.analytics_date,
          row.keyword,
          row.page_url,
          parseInt(row.clicks, 10) || 0,
          parseInt(row.impressions, 10) || 0,
          parseFloat(row.ctr) || 0,
          parseFloat(row.position) || 0
        );
      }
    });

    let batch: CsvRow[] = [];
    let totalRows = 0;

    const parser = createReadStream(CSV_PATH).pipe(
      parse({
        columns: true,
        from_line: 2, // skip duplicate header row
        relax_column_count: true,
        relax_quotes: true, // ~115 rows have unescaped trailing quotes in keywords
        skip_empty_lines: true,
      })
    );

    parser.on("data", (row: CsvRow) => {
      // Skip malformed rows where csv-parse merged fields
      if (!row.page_url) return;

      batch.push(row);

      if (batch.length >= BATCH_SIZE) {
        insertBatch(batch);
        totalRows += batch.length;
        batch = [];
      }
    });

    parser.on("end", () => {
      if (batch.length > 0) {
        insertBatch(batch);
        totalRows += batch.length;
      }
      resolve(totalRows);
    });

    parser.on("error", (err: Error) => reject(err));
  });
}

export async function POST() {
  try {
    const { count } = db.prepare("SELECT COUNT(*) as count FROM gsc").get() as {
      count: number;
    };

    if (count > 0) {
      return NextResponse.json(
        { success: true, message: "already ingested", rowCount: count },
        { status: 200 }
      );
    }

    const rowCount = await ingestCsv();

    return NextResponse.json({ success: true, rowCount });
  } catch (err) {
    console.error("Ingestion failed:", err);
    return NextResponse.json({ success: false, error: "Ingestion failed" }, { status: 500 });
  }
}
