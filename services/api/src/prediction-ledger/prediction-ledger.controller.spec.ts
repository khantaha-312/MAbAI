import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { PredictionLedgerController } from './prediction-ledger.controller';
import { PredictionLedgerService } from './prediction-ledger.service';

function getRoutes(controller: object): Array<{ path: string; method: RequestMethod }> {
  const prototype = Object.getPrototypeOf(controller);
  return Object.getOwnPropertyNames(prototype)
    .filter((name) => name !== 'constructor' && typeof prototype[name] === 'function')
    .map((handlerName) => ({
      path: Reflect.getMetadata(PATH_METADATA, prototype[handlerName]) ?? '',
      method: Reflect.getMetadata(METHOD_METADATA, prototype[handlerName]),
    }));
}

describe('PredictionLedgerController', () => {
  const ledgerService = {
    findAllForUser: jest.fn(),
    getWinRate: jest.fn(),
    create: jest.fn(),
    resolve: jest.fn(),
  };

  let controller: PredictionLedgerController;

  beforeEach(() => {
    controller = new PredictionLedgerController(ledgerService as unknown as PredictionLedgerService);
    jest.clearAllMocks();
  });

  it('does not expose POST /ledger-entries (create)', () => {
    expect((controller as any).create).toBeUndefined();
    const routes = getRoutes(controller);
    expect(routes.some((r) => r.method === RequestMethod.POST && r.path === '/')).toBe(false);
  });

  it('does not expose POST /ledger-entries/:id/resolve', () => {
    expect((controller as any).resolve).toBeUndefined();
    const routes = getRoutes(controller);
    expect(routes.some((r) => r.method === RequestMethod.POST && r.path === '/:id/resolve')).toBe(
      false,
    );
  });

  it('keeps GET /ledger-entries', async () => {
    const routes = getRoutes(controller);
    expect(routes).toContainEqual({ path: '/', method: RequestMethod.GET });

    const entries = [{ id: 'entry-1' }];
    ledgerService.findAllForUser.mockResolvedValue(entries);

    const result = await controller.findAll({ id: 'user-1' } as any);
    expect(ledgerService.findAllForUser).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ data: entries });
  });

  it('keeps GET /ledger-entries/win-rate', async () => {
    const routes = getRoutes(controller);
    expect(routes).toContainEqual({ path: 'win-rate', method: RequestMethod.GET });

    const winRate = { status: 'insufficient_data', totalPredictions: 0, pendingCount: 0, resolvedCount: 0, minimumRequired: 10 };
    ledgerService.getWinRate.mockResolvedValue(winRate);

    const result = await controller.getWinRate({ id: 'user-1' } as any);
    expect(ledgerService.getWinRate).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ data: winRate });
  });
});
