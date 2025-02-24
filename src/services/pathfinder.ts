import { NeynarClient } from './neynar';
import { Database } from './db';

export class PathFinder {
  constructor(
    private neynar: NeynarClient,
    private db: Database
  ) {}

  async findPath(fromUsername: string, toUsername: string): Promise<number[]> {
    // Get FIDs for both usernames
    const [fromUser, toUser] = await Promise.all([
      this.neynar.getUserByUsername(fromUsername),
      this.neynar.getUserByUsername(toUsername)
    ]);

    return this.findShortestPath(fromUser.fid, toUser.fid);
  }

  private async findShortestPath(fromFid: number, toFid: number): Promise<number[]> {
    // Use BFS to find shortest path
    const queue: { fid: number; path: number[] }[] = [{ fid: fromFid, path: [fromFid] }];
    const visited = new Set<number>([fromFid]);

    while (queue.length > 0) {
      const { fid, path } = queue.shift()!;
      
      // Get followers and following
      const [followers, following] = await Promise.all([
        this.neynar.getFollowers(fid),
        this.neynar.getFollowing(fid)
      ]);

      // Combine and deduplicate connections
      const connections = [...new Set([...followers, ...following])];

      // Check each connection
      for (const connectedFid of connections) {
        if (connectedFid === toFid) {
          // Found the target user!
          const finalPath = [...path, toFid];
          
          // Store the connection in the database
          await this.storePathConnections(finalPath);
          
          return finalPath;
        }

        if (!visited.has(connectedFid)) {
          visited.add(connectedFid);
          queue.push({
            fid: connectedFid,
            path: [...path, connectedFid]
          });
        }
      }
    }

    throw new Error('No path found between users');
  }

  private async storePathConnections(path: number[]) {
    // Store each connection in the path
    for (let i = 0; i < path.length - 1; i++) {
      await this.db.storeConnection({
        from_fid: path[i],
        to_fid: path[i + 1]
      });
    }
  }

  async updateConnectionGraph(): Promise<void> {
    // This would be called periodically to update the connection graph
    // For now, we'll rely on discovering connections during path finding
    // TODO: Implement background graph updates
  }
} 