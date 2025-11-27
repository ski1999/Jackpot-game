
import fs from 'fs';
import path from 'path';
import { GameTelemetry } from './types';

// In a real scenario, this might connect to MongoDB, DynamoDB, or Kinesis
const LOG_FILE = path.join(process.cwd(), 'game_telemetry.jsonl');
const MAX_BUFFER_SIZE = 1000;
const FLUSH_INTERVAL_MS = 5000;

export class TelemetryService {
  private buffer: GameTelemetry[] = [];
  private isFlushing = false;
  private interval: NodeJS.Timeout;

  constructor() {
    // Attempt to flush every 5 seconds
    this.interval = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
  }

  public recordEvent(event: GameTelemetry) {
    // Add to buffer
    this.buffer.push(event);

    // Safety: Prevent memory leak if storage is down for too long
    if (this.buffer.length > MAX_BUFFER_SIZE) {
      // Drop oldest 10% of logs
      const dropCount = Math.floor(MAX_BUFFER_SIZE * 0.1);
      this.buffer.splice(0, dropCount);
      console.warn(`Telemetry buffer full. Dropped ${dropCount} old events.`);
    }
  }

  private async flush() {
    if (this.buffer.length === 0 || this.isFlushing) return;

    this.isFlushing = true;
    
    // Take a snapshot of current buffer to write
    // We keep them in 'pending' in case write fails
    const pendingCount = this.buffer.length;
    const pendingData = this.buffer.slice(0, pendingCount);

    try {
      const serialized = pendingData.map(e => JSON.stringify(e)).join('\n') + '\n';
      
      // Simulate External Storage Write (e.g., S3, Mongo)
      // Here we append to a local file
      await fs.promises.appendFile(LOG_FILE, serialized);

      // Success: Remove successfully written items from the main buffer
      // Note: We use splice because new items might have been added while we were writing
      this.buffer.splice(0, pendingCount);
      
      // console.log(`Flushed ${pendingCount} telemetry events.`);
    } catch (error) {
      console.error('Telemetry flush failed. Retrying next cycle.', error);
      // Data remains in this.buffer automatically for the next retry
    } finally {
      this.isFlushing = false;
    }
  }
}
