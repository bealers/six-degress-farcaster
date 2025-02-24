import { Database } from '../services/db.js';

describe('Database', () => {
  let db: Database;

  beforeAll(async () => {
    db = new Database();
    await db.init();
  });

  beforeEach(async () => {
    await db.clear();
  });

  it('should store and retrieve connections', async () => {
    await db.storeConnection({
      from_fid: 1,
      to_fid: 2
    });

    const connections = await db.getConnections(1);
    expect(connections).toHaveLength(1);
    expect(connections[0].from_fid).toBe(1);
    expect(connections[0].to_fid).toBe(2);
  });

  it('should store searches', async () => {
    const result = await db.storeSearch({
      searcher_fid: 1,
      from_fid: 2,
      to_fid: 3,
      path_json: JSON.stringify([2, 4, 3])
    });

    expect(result).toHaveProperty('id');
  });
}); 