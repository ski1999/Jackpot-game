

import fs from 'fs';
import path from 'path';
import { StatsDatabase } from './stats';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Go up from backend/ to root
const ROOT_DIR = path.join(__dirname, '..');
const BACKUP_DIR = path.join(ROOT_DIR, 'backups');
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour
const RESET_INTERVAL_DAYS = 7;
const LAST_RESET_FILE = path.join(ROOT_DIR, 'last_reset.txt');

export class WeeklyArchiver {
  private statsDb: StatsDatabase;
  private interval: NodeJS.Timeout;

  constructor(statsDb: StatsDatabase) {
    this.statsDb = statsDb;
    
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR);
    }

    // Initial check on startup
    this.checkAndArchive();
    this.interval = setInterval(() => this.checkAndArchive(), CHECK_INTERVAL_MS);
  }

  private async checkAndArchive() {
      const now = new Date();
      let lastReset = new Date(0); // Epoch start if never reset

      if (fs.existsSync(LAST_RESET_FILE)) {
          const content = fs.readFileSync(LAST_RESET_FILE, 'utf-8');
          const timestamp = parseInt(content);
          if (!isNaN(timestamp)) {
              lastReset = new Date(timestamp);
          }
      }

      const diffTime = Math.abs(now.getTime() - lastReset.getTime());
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      console.log(`[Archiver] Days since last reset: ${diffDays.toFixed(2)}`);

      if (diffDays >= RESET_INTERVAL_DAYS) {
          console.log("Weekly Archive Triggered...");
          await this.performArchive(now);
      }
  }

  private async performArchive(now: Date) {
      try {
          const stats = await this.statsDb.getAllStats();
          const timestamp = now.toISOString().replace(/[:.]/g, '-');
          const filename = path.join(BACKUP_DIR, `stats-backup-${timestamp}.json`);
          
          await fs.promises.writeFile(filename, JSON.stringify(stats, null, 2));
          console.log(`Stats backed up to ${filename}`);

          await this.statsDb.resetStats();
          console.log("Stats database truncated for new week.");
          
          // Update last reset time
          fs.writeFileSync(LAST_RESET_FILE, now.getTime().toString());
          
      } catch (e) {
          console.error("Archive Failed:", e);
      }
  }
}