import { ConnectionService } from '../services/connection';

describe('ConnectionService', () => {
  let service: ConnectionService;

  beforeEach(() => {
    service = new ConnectionService();
  });

  describe('findConnection', () => {
    it('should return null for non-existent users', async () => {
      const result = await service.findConnection('nonexistent1', 'nonexistent2');
      expect(result).toBeNull();
    });
  });

  describe('getUser', () => {
    it('should return null for non-existent user', async () => {
      const result = await service.getUser('nonexistent');
      expect(result).toBeNull();
    });
  });
}); 