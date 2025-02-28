import { GraphAPI } from '../types/graph.js';
import { Database } from './db.js';
import { config } from '../config.js';

// Configuration for path finding
const MAX_DEPTH = 6; // Maximum degrees of separation to search
const MAX_QUEUE_SIZE = 10000; // Safety limit to prevent memory issues
const CONNECTION_BATCH_SIZE = 100; // Number of connections to process in a batch
const TIMEOUT_MS = 60000; // 60 second timeout for path finding

export class PathFinder {
  constructor(
    private db: Database,
    private api: GraphAPI
  ) {
    console.log('[PATHFINDER] Initialized with database and GraphAPI');
    
    // Verify API methods are available
    this.verifyApiMethods();
  }
  
  // Verify that required API methods are available
  private verifyApiMethods(): void {
    const requiredMethods = ['getFollowers', 'getFollowing', 'getUserByFid'];
    const missingMethods = requiredMethods.filter(
      method => typeof (this.api as any)[method] !== 'function'
    );
    
    if (missingMethods.length > 0) {
      console.error(`[PATHFINDER] Warning: GraphAPI is missing required methods: ${missingMethods.join(', ')}`);
    } else {
      console.log('[PATHFINDER] GraphAPI interface verification passed');
    }
  }

  async findPath(fromFid: number, toFid: number): Promise<number[]> {
    console.log(`[PATHFINDER] Starting path search from ${fromFid} to ${toFid}`);
    
    try {
      // Get source and target user details by FID
      const [sourceUser, targetUser] = await Promise.all([
        this.api.getUserByFid(fromFid),
        this.api.getUserByFid(toFid)
      ]);

      console.log(`[PATHFINDER] Resolved usernames to FIDs: ${sourceUser.fid} -> ${targetUser.fid}`);
      
      // Check if this is a search for the same user
      if (sourceUser.fid === targetUser.fid) {
        console.log(`[PATHFINDER] Self-connection detected, returning direct path`);
        return [sourceUser.fid];
      }

      // Try to find a cached path first
      try {
        const cachedPath = await this.findCachedPath(sourceUser.fid, targetUser.fid);
        if (cachedPath) {
          console.log(`[PATHFINDER] Found cached path: ${cachedPath.join(' -> ')}`);
          return cachedPath;
        }
      } catch (error) {
        console.log(`[PATHFINDER] No cached path found, will perform BFS search`);
      }

      // Start the BFS search with a timeout
      return this.findShortestPath(sourceUser.fid, targetUser.fid);
    } catch (error) {
      console.error('[PATHFINDER] Error checking for direct connection:', error);
      console.log('[PATHFINDER] Will continue with BFS search anyway');
      // Use the wrapper with timeout for consistency
      return this.findShortestPath(fromFid, toFid);
    }
  }

  private async findCachedPath(fromFid: number, toFid: number): Promise<number[] | null> {
    console.log(`[PATHFINDER] Checking database for cached path between ${fromFid} and ${toFid}`);
    
    try {
      // Look for recent searches with this exact path
      const searches = await this.db.getRecentSearches({
        from_fid: fromFid,
        to_fid: toFid,
        limit: 1
      });
      
      // If we found a recent search with this path
      if (searches && searches.length > 0 && searches[0].path_json) {
        console.log(`[PATHFINDER] Found cached path in recent searches`);
        
        try {
          // Parse the path JSON and convert to FIDs
          const pathData = JSON.parse(searches[0].path_json);
          
          // Ensure it's a valid path
          if (Array.isArray(pathData) && pathData.length >= 2) {
            // Extract FIDs from the path objects
            const fidPath = pathData.map(user => user.fid);
            console.log(`[PATHFINDER] Using cached path: ${fidPath.join(' -> ')}`);
            return fidPath;
          }
        } catch (parseError) {
          console.error(`[PATHFINDER] Error parsing cached path:`, parseError);
        }
      }
      
      // If no direct path found, try to reconstruct from connections
      console.log(`[PATHFINDER] No direct cached path found, attempting to reconstruct from stored connections`);
      
      // This would be a more complex implementation using the stored connections
      // to try to rebuild a path, but for now we'll return null and fall back to BFS
      
      return null;
    } catch (dbError) {
      console.error(`[PATHFINDER] Database error while checking for cached path:`, dbError);
      return null;
    }
  }

  /**
   * Find the shortest path between two users
   * Uses timeout protection by default
   * @param fromFid Starting user FID
   * @param toFid Target user FID
   * @param useTimeout Whether to use timeout protection (default: true)
   * @returns Promise resolving to path of FIDs
   */
  async findShortestPath(fromFid: number, toFid: number, useTimeout: boolean = true): Promise<number[]> {
    console.log(`[PATHFINDER] Finding shortest path from ${fromFid} to ${toFid} (timeout: ${useTimeout ? 'enabled' : 'disabled'})`);
    
    if (!useTimeout) {
      // Run BFS directly without timeout if explicitly requested
      return this.runBFSSearch(fromFid, toFid);
    }
    
    return new Promise((resolve, reject) => {
      // Set a timeout to prevent long-running searches
      const timeoutId = setTimeout(() => {
        reject(new Error(`Path finding timeout after ${TIMEOUT_MS/1000} seconds`));
      }, TIMEOUT_MS);

      // Start the BFS search
      this.runBFSSearch(fromFid, toFid)
        .then(path => {
          clearTimeout(timeoutId);
          resolve(path);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Uses BFS to find the shortest path between users
   */
  private async runBFSSearch(fromFid: number, toFid: number): Promise<number[]> {
    console.log(`[PATHFINDER] Running BFS search from FID: ${fromFid} to FID: ${toFid} with max depth ${MAX_DEPTH}`);

    // Early detection for direct connections
    try {
      // Check if these users have a direct connection already
      const connections = await this.getConnections(fromFid);
      
      if (connections && connections.length > 0) {
        console.log(`[PATHFINDER] Found ${connections.length} existing connections for ${fromFid}`);
        if (connections.some(conn => conn === toFid)) {
          console.log(`[PATHFINDER] Direct connection found from ${fromFid} to ${toFid}`);
          return [fromFid, toFid];
        }
      } else {
        console.log(`[PATHFINDER] No existing connections found for ${fromFid} in database`);
      }
    } catch (error) {
      console.error('[PATHFINDER] Error checking for direct connection:', error);
      console.log('[PATHFINDER] Will continue with BFS search anyway');
    }

    console.log(`[PATHFINDER] Starting BFS search from ${fromFid} to ${toFid} (max ${MAX_DEPTH} degrees)`);
    // Use BFS to find shortest path
    const queue: { fid: number; path: number[]; depth: number }[] = [
      { fid: fromFid, path: [fromFid], depth: 0 }
    ];
    const visited = new Set<number>([fromFid]);
    let nodesExplored = 0;
    let maxDepthReached = 0;

    console.log(`[PATHFINDER] Queue initialized with starting node ${fromFid}`);

    while (queue.length > 0 && nodesExplored < MAX_QUEUE_SIZE) {
      const { fid, path, depth } = queue.shift()!;
      nodesExplored++;
      
      // Track max depth reached
      if (depth > maxDepthReached) {
        maxDepthReached = depth;
        console.log(`[PATHFINDER] Reached new depth level: ${depth}`);
      }
      
      // Log progress periodically
      if (nodesExplored % 100 === 0) {
        console.log(`[PATHFINDER] Explored ${nodesExplored} nodes, queue size: ${queue.length}, current depth: ${depth}, max depth reached: ${maxDepthReached}`);
      }
      
      // If we've reached max depth, skip this node
      if (depth >= MAX_DEPTH) {
        console.log(`[PATHFINDER] Skipping node at max depth ${depth} (MAX_DEPTH = ${MAX_DEPTH})`);
        continue;
      }
      
      try {
        // Get followers and following
        console.log(`[PATHFINDER] Fetching connections for FID: ${fid} at depth ${depth}`);
        const [followers, following] = await Promise.all([
          this.api.getFollowers(fid),
          this.api.getFollowing(fid)
        ]);

        console.log(`[DEBUG] Followers: ${JSON.stringify(followers)}`);
        console.log(`[DEBUG] Following: ${JSON.stringify(following)}`);

        // Explicitly ensure everything is a number and deduplicate
        const connections = Array.from(new Set([...followers, ...following]
          .filter(fid => typeof fid === 'number' && fid > 0)));
        console.log(`[PATHFINDER] Found ${connections.length} total connections for FID: ${fid} at depth ${depth}`);

        // Process connections in smaller batches to avoid blocking
        for (let i = 0; i < connections.length; i += CONNECTION_BATCH_SIZE) {
          const batch = connections.slice(i, i + CONNECTION_BATCH_SIZE);
          
          // Check each connection in the batch
          for (const connectedFid of batch) {
            // Store this connection in the database for future searches
            await this.db.storeConnection({ from_fid: fid, to_fid: connectedFid });
            
            if (connectedFid === toFid) {
              // Found the target user!
              const finalPath = [...path, toFid];
              console.log(`[PATHFINDER] Found path! Length: ${finalPath.length}, Path: ${finalPath.join(' -> ')}, Max depth reached: ${maxDepthReached}`);
              
              // Store the full path connections in the database
              await this.storePathConnections(finalPath);
              
              return finalPath;
            }

            if (!visited.has(connectedFid)) {
              visited.add(connectedFid);
              queue.push({
                fid: connectedFid,
                path: [...path, connectedFid],
                depth: depth + 1
              });
            }
          }
        }
      } catch (error) {
        console.error(`[PATHFINDER] Error exploring connections for FID ${fid} at depth ${depth}:`, error);
        // Continue with next node rather than failing the whole search
        continue;
      }
    }

    console.log(`[PATHFINDER] Search completed. Max depth reached: ${maxDepthReached}/${MAX_DEPTH}`);
    if (nodesExplored >= MAX_QUEUE_SIZE) {
      console.warn(`[PATHFINDER] Search terminated after reaching max queue size (${MAX_QUEUE_SIZE})`);
    }

    throw new Error(`No path found between users after exploring ${nodesExplored} connections (max depth reached: ${maxDepthReached})`);
  }

  private async storePathConnections(path: number[]) {
    console.log(`[PATHFINDER] Storing new path connections in database: ${path.join(' -> ')}`);
    // Store each connection in the path
    for (let i = 0; i < path.length - 1; i++) {
      await this.db.storeConnection({
        from_fid: path[i],
        to_fid: path[i + 1]
      });
      
      // Also store the reverse connection, as following is often mutual
      // This helps with future path finding
      await this.db.storeConnection({
        from_fid: path[i + 1],
        to_fid: path[i]
      });
    }
  }

  async updateConnectionGraph(): Promise<void> {
    // TODO: Called periodically to update the connection graph
    // For now, we'll rely on discovering connections during path finding 
  }

  /**
   * Retrieves cached user information
   */
  async getCachedUserInfo(fid: number) {
    try {
      return await this.api.lookupUserByFid(fid);
    } catch (error) {
      console.error(`[PATHFINDER] Error retrieving user info for FID ${fid}:`, error);
      return null;
    }
  }

  /**
   * Initialize or reinitialize the pathfinder with new dependencies
   */
  public init(db: Database, api: GraphAPI): void {
    this.db = db;
    this.api = api;
    console.log('[PATHFINDER] Initialized with database and API');
    this.verifyApiMethods();
  }

  /**
   * Get stored connections for a user from the database
   */
  private async getConnections(fid: number): Promise<number[]> {
    try {
      // Check if we're using the database interface properly
      if (!this.db) {
        console.error('[PATHFINDER] Database not initialized');
        return [];
      }
      
      // Use the db's getStoredConnections method if it exists
      if (typeof this.db.getStoredConnections === 'function') {
        return await this.db.getStoredConnections(fid);
      }
      
      // If no specific method, try a fallback approach
      console.log('[PATHFINDER] Database missing getConnections method, using API methods directly');
      
      // Get connections directly from the API
      if (this.api) {
        const [followers, following] = await Promise.all([
          this.api.getFollowers(fid),
          this.api.getFollowing(fid)
        ]);
        
        // Combine unique followers and following
        const connections = [...new Set([...followers, ...following])];
        return connections;
      }
      
      return [];
    } catch (error) {
      console.error(`[PATHFINDER] Error getting connections for FID ${fid}:`, error);
      return [];
    }
  }
} 