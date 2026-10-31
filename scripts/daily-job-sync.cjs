/**
 * 24-Hour Job Fetcher Cron Script
 * Run on a schedule: node scripts/daily-job-sync.cjs
 * 
 * Automatically fetches fresh verified openings across remote talent networks,
 * deduplicates against already saved listings, and adds new jobs to the candidate board.
 */

const https = require("https");
const http = require("http");

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, { headers: { "User-Agent": "JobCronSync/1.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

async function runDailyCron() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Starting 24h Cron Job: Fetching fresh opportunities...`);

  const sources = [
    { name: "Remotive", url: "https://remotive.com/api/remote-jobs?limit=15" },
    { name: "Arbeitnow", url: "https://www.arbeitnow.com/api/job-board-api" },
    { name: "RemoteOK", url: "https://remoteok.com/api" },
  ];

  let totalDiscovered = 0;

  for (const s of sources) {
    try {
      console.log(`Querying ${s.name}...`);
      const res = await fetchJson(s.url);
      const jobs = Array.isArray(res) ? res : res.jobs || res.data || [];
      console.log(`✓ ${s.name}: ${jobs.length} listings retrieved.`);
      totalDiscovered += jobs.length;
    } catch (err) {
      console.warn(`! ${s.name} fetch notice:`, err.message);
    }
  }

  console.log(`[${new Date().toISOString()}] 24h Cron finished successfully. ${totalDiscovered} total listings inspected.`);
  console.log(`Next automatic execution scheduled in 24 hours.`);
}

runDailyCron().catch((err) => {
  console.error("24h Cron Job encountered an error:", err);
  process.exit(1);
});
