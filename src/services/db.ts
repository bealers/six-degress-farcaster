import { createClient } from '@libsql/client';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

// Row type for Turso client results
type Row = Record<string, any>;

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
  private isInitialized: boolean = false;
  private _initPromise: Promise<void> | null = null;

  constructor(url?: string, authToken?: string) {
    this.isDev = process.env.NODE_ENV !== 'production';
    
    if (this.isDev) {
      // Use local SQLite for development
      this.sqlite = new sqlite3.Database('dev.db');
    } else {
      // Use Turso in production
      if (!url || !authToken) {
        throw new Error('Turso URL and auth token required in .env');
      }
      this.client = createClient({
        url,
        authToken,
      });
    }
  }

  async init(): Promise<void> {
    // If already initialized, return immediately
    if (this.isInitialized) {
      console.log('[DATABASE] Already initialized, skipping');
      return;
    }
    
    console.log('[DATABASE] Starting database initialization');

    try {
      // Check if tables already exist before creating them
      const tablesExist = await this.checkTablesExist();
      
      if (tablesExist) {
        console.log('[DATABASE] Tables already exist, skipping initialization');
      } else {
        console.log('[DATABASE] Creating database tables...');
        await this.createTables();
        console.log('[DATABASE] All tables created successfully');
      }
      
      console.log('[DATABASE] Database initialization completed');
      this.isInitialized = true; // Mark as initialized
    } catch (error) {
      console.error('[DATABASE] Error initializing database:', error);
      throw error;
    }
  }

  /**
   * Check if the required tables already exist
   */
  private async checkTablesExist(): Promise<boolean> {
    try {
      let searchesExists = false;
      let connectionsExists = false;
      
      if (this.isDev && this.sqlite) {
        // SQLite check
        const tables = await this.sqliteAll(
          "SELECT name FROM sqlite_master WHERE type='table' AND (name='searches' OR name='connections')"
        ) as Array<{name: string}>;
        
        searchesExists = tables.some(t => t.name === 'searches');
        connectionsExists = tables.some(t => t.name === 'connections');
      } else if (!this.isDev && this.client) {
        // Turso check
        try {
          const searchesResult = await this.client.execute("SELECT 1 FROM searches LIMIT 1");
          searchesExists = true;
        } catch (e) {
          // Table doesn't exist
          searchesExists = false;
        }
        
        try {
          const connectionsResult = await this.client.execute("SELECT 1 FROM connections LIMIT 1");
          connectionsExists = true;
        } catch (e) {
          // Table doesn't exist
          connectionsExists = false;
        }
      }
      
      const result = searchesExists || connectionsExists;
      console.log(`[DATABASE] Tables exist check: searches=${searchesExists}, connections=${connectionsExists}, result=${result}`);
      return result;
    } catch (error) {
      console.error('[DATABASE] Error checking if tables exist:', error);
      // Assume tables don't exist if we encounter an error
      return false;
    }
  }

  // ----- promise-based wrappers around SQLite -----
  
  private async sqliteRun(sql: string, params: any[] = []) {
    if (!this.sqlite) throw new Error('SQLite not initialized');
    return new Promise((resolve, reject) => {
      this.sqlite!.run(sql, params, function(err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
  
  private async sqliteAll(sql: string, params: any[] = []) {
    if (!this.sqlite) throw new Error('SQLite not initialized');
    return new Promise((resolve, reject) => {
      this.sqlite!.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    console.log('[DATABASE] Creating database tables...');
    
    const createSearchesTable = `
      CREATE TABLE IF NOT EXISTS searches (
        id INTEGER PRIMARY KEY,
        searcher_fid INTEGER,
        from_fid INTEGER,
        to_fid INTEGER,
        path_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    const createConnectionsTable = `
      CREATE TABLE IF NOT EXISTS connections (
        from_fid INTEGER,
        to_fid INTEGER,
        last_updated TIMESTAMP,
        PRIMARY KEY (from_fid, to_fid)
      )
    `;

    try {
      if (this.isDev && this.sqlite) {
        // SQLite initialization - execute each statement separately
        console.log('[DATABASE] Creating searches table...');
        await this.sqliteRun(createSearchesTable);
        console.log('[DATABASE] Creating connections table...');
        await this.sqliteRun(createConnectionsTable);
        
        // Verify tables exist
        const tables = await this.sqliteAll("SELECT name FROM sqlite_master WHERE type='table'") as Array<{name: string}>;
        console.log('[DATABASE] Created tables:', tables.map(t => t.name).join(', '));
      } else if (!this.isDev && this.client) {
        // Turso initialization
        console.log('[DATABASE] Creating searches table...');
        await this.client.execute(createSearchesTable);
        console.log('[DATABASE] Creating connections table...');
        await this.client.execute(createConnectionsTable);
        console.log('[DATABASE] Tables created');
      } else {
        throw new Error('Database not properly initialized');
      }
    } catch (error) {
      console.error('[DATABASE] Error creating tables:', error);
      throw error;
    }
  }

  /**
   * Ensure database is initialized before performing operations
   */
  private async ensureInitialized() {
    // Check if already initialized or initialization in progress
    if (this.isInitialized) {
      return; // Already initialized, no need to continue
    }
    
    if (!this._initPromise) {
      console.log('[DATABASE] Auto-initializing database before query');
      this._initPromise = this.init();
    }
    
    try {
      await this._initPromise;
      this.isInitialized = true; // Mark as initialized after successful initialization
    } catch (error) {
      console.error('[DATABASE] Error during initialization:', error);
      this._initPromise = null; // Reset promise so we can try again
      throw error;
    }
  }

  async storeSearch(search: Omit<SearchResult, 'id' | 'created_at'>) {
    await this.ensureInitialized();

    const sql = `
      INSERT INTO searches (searcher_fid, from_fid, to_fid, path_json)
      VALUES (?, ?, ?, ?)
      RETURNING id
    `;
    const args = [search.searcher_fid, search.from_fid, search.to_fid, search.path_json];

    if (this.isDev && this.sqlite) {
      const result = await this.sqliteRun(sql, args);
      return { id: (result as any).lastID };
    } else if (!this.isDev && this.client) {
      const result = await this.client.execute({ sql, args });
      // Type cast to handle possible undefined
      const row = result.rows[0] || {};
      return { id: (row.id as number) || 0 };
    } else {
      throw new Error('Database not properly initialized');
    }
  }

  async storeConnection(connection: Omit<Connection, 'last_updated'>) {
    await this.ensureInitialized();

    const sql = `
      INSERT OR REPLACE INTO connections (from_fid, to_fid, last_updated)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `;
    const args = [connection.from_fid, connection.to_fid];

    if (this.isDev && this.sqlite) {
      await this.sqliteRun(sql, args);
    } else if (!this.isDev && this.client) {
      await this.client.execute({ sql, args });
    } else {
      throw new Error('Database not properly initialized');
    }
  }

  async getConnections(fid: number): Promise<Connection[]> {
    await this.ensureInitialized();

    try {
      // First check if the connections table exists
      if (this.isDev && this.sqlite) {
        const tables = await this.sqliteAll(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='connections'"
        ) as Array<{name: string}>;
        
        if (tables.length === 0) {
          console.log('[DATABASE] Connections table does not exist yet, creating it now');
          
          const createConnectionsTable = `
            CREATE TABLE IF NOT EXISTS connections (
              from_fid INTEGER,
              to_fid INTEGER,
              last_updated TIMESTAMP,
              PRIMARY KEY (from_fid, to_fid)
            )
          `;
          
          await this.sqliteRun(createConnectionsTable);
          console.log('[DATABASE] Connections table created');
          // Since we just created the table, it will be empty
          return [];
        }
      }

      // Now query the connections
      const sql = `
        SELECT * FROM connections 
        WHERE from_fid = ? OR to_fid = ?
      `;
      const args = [fid, fid];

      if (this.isDev && this.sqlite) {
        return await this.sqliteAll(sql, args) as Connection[];
      } else if (!this.isDev && this.client) {
        const result = await this.client.execute({ sql, args });
        return result.rows.map(row => ({
          from_fid: row.from_fid as number,
          to_fid: row.to_fid as number,
          last_updated: row.last_updated as string
        }));
      } else {
        throw new Error('Database not properly initialized');
      }
    } catch (error) {
      console.error('[DATABASE] Error getting connections:', error);
      // Return an empty array instead of throwing
      return [];
    }
  }

  /**
   * Get recent searches matching the specified criteria
   * @param params Search parameters to filter by
   * @returns Array of search results
   */
  async getRecentSearches(params: { 
    from_fid?: number; 
    to_fid?: number; 
    limit?: number 
  }): Promise<SearchResult[]> {
    await this.ensureInitialized();

    try {
      // First check if the searches table exists
      if (this.isDev && this.sqlite) {
        const tables = await this.sqliteAll(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='searches'"
        ) as Array<{name: string}>;
        
        if (tables.length === 0) {
          console.log('[DATABASE] Searches table does not exist yet, creating it now');
          
          const createSearchesTable = `
            CREATE TABLE IF NOT EXISTS searches (
              id INTEGER PRIMARY KEY,
              searcher_fid INTEGER,
              from_fid INTEGER,
              to_fid INTEGER,
              path_json TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `;
          
          await this.sqliteRun(createSearchesTable);
          console.log('[DATABASE] Searches table created');
          // Since we just created the table, it will be empty
          return [];
        }
      }

      let sql = `
        SELECT * FROM searches 
        WHERE 1=1
      `;
      
      const args: any[] = [];
      
      if (params.from_fid !== undefined) {
        sql += ` AND from_fid = ?`;
        args.push(params.from_fid);
      }
      
      if (params.to_fid !== undefined) {
        sql += ` AND to_fid = ?`;
        args.push(params.to_fid);
      }
      
      sql += ` ORDER BY created_at DESC`;
      
      if (params.limit !== undefined) {
        sql += ` LIMIT ?`;
        args.push(params.limit);
      }

      if (this.isDev && this.sqlite) {
        return await this.sqliteAll(sql, args) as SearchResult[];
      } else if (!this.isDev && this.client) {
        const result = await this.client.execute({ sql, args });
        return result.rows.map(row => ({
          id: row.id as number,
          searcher_fid: row.searcher_fid as number,
          from_fid: row.from_fid as number,
          to_fid: row.to_fid as number,
          path_json: row.path_json as string,
          created_at: row.created_at as string
        }));
      } else {
        throw new Error('Database not properly initialized');
      }
    } catch (error) {
      console.error('[DATABASE] Error getting recent searches:', error);
      // Return an empty array instead of throwing
      return [];
    }
  }

  // Helper method to clear database
  async clear() {
    await this.ensureInitialized();
    
    if (!this.isDev) {
      throw new Error('Clear method only available in development');
    }

    if (this.sqlite) {
      const sql = `
        DELETE FROM searches;
        DELETE FROM connections;
      `;

      await this.sqliteRun(sql);
    }
  }

  /**
   * Get stored connections for a user
   * @param fid The user's FID
   * @returns Array of connected FIDs
   */
  async getStoredConnections(fid: number): Promise<number[]> {
    try {
      // Ensure database is initialized
      await this.ensureInitialized();
      
      const query = `
        SELECT to_fid FROM connections
        WHERE from_fid = ?
      `;
      
      if (this.client) {
        // For Turso
        const result = await this.client.execute({
          sql: query,
          args: [fid]
        });
        
        return result.rows.map(row => Number(row.to_fid));
      } else if (this.sqlite) {
        // This else-if block handles SQLite database connections in development mode
        // First we check if this.sqlite exists, indicating SQLite is being used
        // However, there's a redundant null check here since we're already inside
        // an if(this.sqlite) block. The inner if(!this.sqlite) can never be true
        // because we already confirmed this.sqlite exists in the outer condition.
        // This appears to be defensive programming but is logically unnecessary.
        // If SQLite isn't initialized, we log an error and return empty array
        if (!this.sqlite) {
          console.error('[DATABASE] SQLite not initialized in getStoredConnections');
          return [];
        }
        
        return new Promise((resolve, reject) => {
          this.sqlite!.all(query, [fid], (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map((row: any) => Number(row.to_fid)));
          });
        });
      }
      
      return [];
    } catch (error) {
      console.error(`[DATABASE] Error getting connections for FID ${fid}:`, error);
      return [];
    }
  }
} 