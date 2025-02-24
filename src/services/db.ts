import { createClient } from '@libsql/client';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

export interface SearchResult {
  id: number;
  searcher_fid: number;
  from_fid: number;
  to_fid: number;
  path_json: string;
  created_at: string;
}

export interface Connection {
  from_fid: number;
  to_fid: number;
  last_updated: string;
}

export class Database {
  private client;
  private sqlite?: sqlite3.Database;
  private isDev: boolean;

  constructor(url?: string, authToken?: string) {
    this.isDev = process.env.NODE_ENV !== 'production';
    
    if (this.isDev) {
      // Use local SQLite for development
      this.sqlite = new sqlite3.Database('dev.db');
    } else {
      // Use Turso in production
      if (!url || !authToken) {
        throw new Error('Turso URL and auth token required in production');
      }
      this.client = createClient({
        url,
        authToken,
      });
    }
  }

  async init() {
    const schema = `
      CREATE TABLE IF NOT EXISTS searches (
        id INTEGER PRIMARY KEY,
        searcher_fid INTEGER,
        from_fid INTEGER,
        to_fid INTEGER,
        path_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS connections (
        from_fid INTEGER,
        to_fid INTEGER,
        last_updated TIMESTAMP,
        PRIMARY KEY (from_fid, to_fid)
      );
    `;

    if (this.isDev) {
      // SQLite initialization
      const run = promisify(this.sqlite!.run.bind(this.sqlite));
      await run(schema);
    } else {
      // Turso initialization
      await this.client.execute(schema);
    }
  }

  async storeSearch(search: Omit<SearchResult, 'id' | 'created_at'>) {
    const sql = `
      INSERT INTO searches (searcher_fid, from_fid, to_fid, path_json)
      VALUES (?, ?, ?, ?)
      RETURNING id
    `;
    const args = [search.searcher_fid, search.from_fid, search.to_fid, search.path_json];

    if (this.isDev) {
      const run = promisify(this.sqlite!.run.bind(this.sqlite));
      const result = await run(sql, args);
      return { id: (result as any).lastID };
    } else {
      const result = await this.client.execute({ sql, args });
      return result.rows[0];
    }
  }

  async storeConnection(connection: Omit<Connection, 'last_updated'>) {
    const sql = `
      INSERT OR REPLACE INTO connections (from_fid, to_fid, last_updated)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `;
    const args = [connection.from_fid, connection.to_fid];

    if (this.isDev) {
      const run = promisify(this.sqlite!.run.bind(this.sqlite));
      await run(sql, args);
    } else {
      await this.client.execute({ sql, args });
    }
  }

  async getConnections(fid: number): Promise<Connection[]> {
    const sql = `
      SELECT * FROM connections 
      WHERE from_fid = ? OR to_fid = ?
    `;
    const args = [fid, fid];

    if (this.isDev) {
      const all = promisify(this.sqlite!.all.bind(this.sqlite));
      return all(sql, args) as Promise<Connection[]>;
    } else {
      const result = await this.client.execute({ sql, args });
      return result.rows as Connection[];
    }
  }

  // Helper method to clear database (useful for development)
  async clear() {
    if (!this.isDev) {
      throw new Error('Clear method only available in development');
    }

    const sql = `
      DELETE FROM searches;
      DELETE FROM connections;
    `;

    const run = promisify(this.sqlite!.run.bind(this.sqlite));
    await run(sql);
  }
} 