import { PriceBarController } from './price-bar.controller';
import { PriceBarService } from './price-bar.service';

describe('PriceBarController', () => {
  const priceBarService = {
    ensureHistory: jest.fn(),
    backfillEquityHistory: jest.fn(),
    backfillCryptoHistory: jest.fn(),
  };

  let controller: PriceBarController;

  beforeEach(() => {
    controller = new PriceBarController(priceBarService as unknown as PriceBarService);
    jest.clearAllMocks();
  });

  describe('POST /price-bars/backfill/equity/:symbol', () => {
    it('uses ensureHistory instead of directly calling backfillEquityHistory', async () => {
      const result = { instrumentId: 'instr-1', barsWritten: 100, freshlyBackfilled: true };
      priceBarService.ensureHistory.mockResolvedValue(result);

      await controller.backfillEquity('AAPL', '30');

      expect(priceBarService.ensureHistory).toHaveBeenCalledWith('AAPL', 'equity', 30);
      expect(priceBarService.backfillEquityHistory).not.toHaveBeenCalled();
    });

    it('respects the existing history safeguard via ensureHistory', async () => {
      const result = { instrumentId: 'instr-1', barsWritten: 55, freshlyBackfilled: false };
      priceBarService.ensureHistory.mockResolvedValue(result);

      const response = await controller.backfillEquity('AAPL', '30');

      expect(response).toEqual({ data: result });
      expect(priceBarService.ensureHistory).toHaveBeenCalledWith('AAPL', 'equity', 30);
    });

    it('allows legitimate backfill when safeguard permits', async () => {
      const result = { instrumentId: 'instr-1', barsWritten: 90, freshlyBackfilled: true };
      priceBarService.ensureHistory.mockResolvedValue(result);

      const response = await controller.backfillEquity('AAPL', '90');

      expect(response).toEqual({ data: result });
      expect(priceBarService.ensureHistory).toHaveBeenCalledWith('AAPL', 'equity', 90);
    });

    it('defaults to 30 days when no days query param provided', async () => {
      const result = { instrumentId: 'instr-1', barsWritten: 30, freshlyBackfilled: true };
      priceBarService.ensureHistory.mockResolvedValue(result);

      await controller.backfillEquity('AAPL');

      expect(priceBarService.ensureHistory).toHaveBeenCalledWith('AAPL', 'equity', 30);
    });
  });

  describe('POST /price-bars/backfill/crypto/:coinId', () => {
    it('uses ensureHistory instead of directly calling backfillCryptoHistory', async () => {
      const result = { instrumentId: 'instr-1', barsWritten: 100, freshlyBackfilled: true };
      priceBarService.ensureHistory.mockResolvedValue(result);

      await controller.backfillCrypto('BTC', '30');

      expect(priceBarService.ensureHistory).toHaveBeenCalledWith('BTC', 'crypto', 30);
      expect(priceBarService.backfillCryptoHistory).not.toHaveBeenCalled();
    });

    it('respects the existing history safeguard via ensureHistory', async () => {
      const result = { instrumentId: 'instr-1', barsWritten: 55, freshlyBackfilled: false };
      priceBarService.ensureHistory.mockResolvedValue(result);

      const response = await controller.backfillCrypto('BTC', '30');

      expect(response).toEqual({ data: result });
      expect(priceBarService.ensureHistory).toHaveBeenCalledWith('BTC', 'crypto', 30);
    });

    it('allows legitimate backfill when safeguard permits', async () => {
      const result = { instrumentId: 'instr-1', barsWritten: 90, freshlyBackfilled: true };
      priceBarService.ensureHistory.mockResolvedValue(result);

      const response = await controller.backfillCrypto('BTC', '90');

      expect(response).toEqual({ data: result });
      expect(priceBarService.ensureHistory).toHaveBeenCalledWith('BTC', 'crypto', 90);
    });

    it('defaults to 30 days when no days query param provided', async () => {
      const result = { instrumentId: 'instr-1', barsWritten: 30, freshlyBackfilled: true };
      priceBarService.ensureHistory.mockResolvedValue(result);

      await controller.backfillCrypto('BTC');

      expect(priceBarService.ensureHistory).toHaveBeenCalledWith('BTC', 'crypto', 30);
    });
  });
});
