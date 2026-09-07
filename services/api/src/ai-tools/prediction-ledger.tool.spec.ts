// src/ai-tools/prediction-ledger.tool.spec.ts
import { Test } from '@nestjs/testing';
import { PredictionLedgerTool } from './prediction-ledger.tool';
import { PredictionLedgerService } from '../prediction-ledger/prediction-ledger.service';

describe('PredictionLedgerTool', () => {
  let tool: PredictionLedgerTool;
  let ledgerService: { findAllForUser: jest.Mock };

  beforeEach(async () => {
    ledgerService = { findAllForUser: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PredictionLedgerTool,
        { provide: PredictionLedgerService, useValue: ledgerService },
      ],
    }).compile();

    tool = moduleRef.get(PredictionLedgerTool);
  });

  it('delegates to PredictionLedgerService.findAllForUser with the right arg', async () => {
    const fakeEntries = [{ id: 'entry-1' }, { id: 'entry-2' }] as any;
    ledgerService.findAllForUser.mockResolvedValue(fakeEntries);

    const result = await tool.execute({ userId: 'user-1' });

    expect(ledgerService.findAllForUser).toHaveBeenCalledWith('user-1');
    expect(ledgerService.findAllForUser).toHaveBeenCalledTimes(1);
    expect(result).toBe(fakeEntries);
  });
});