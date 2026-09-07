import { Test } from '@nestjs/testing';
import { MarketDataTool } from './market-data.tool';
import { EvidencePackageService } from '../evidence-package/evidence-package.service';

describe('MarketDataTool', () => {
  let tool: MarketDataTool;
  let evidencePackageService: { buildEvidencePackage: jest.Mock };

  beforeEach(async () => {
    evidencePackageService = { buildEvidencePackage: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        MarketDataTool,
        { provide: EvidencePackageService, useValue: evidencePackageService },
      ],
    }).compile();

    tool = moduleRef.get(MarketDataTool);
  });

  it('delegates to EvidencePackageService.buildEvidencePackage with the right args', async () => {
    const fakeResult = { symbol: 'AAPL', assetType: 'equity' } as any;
    evidencePackageService.buildEvidencePackage.mockResolvedValue(fakeResult);

    const result = await tool.execute({ symbol: 'AAPL', assetType: 'equity' });

    expect(evidencePackageService.buildEvidencePackage).toHaveBeenCalledWith('AAPL', 'equity');
    expect(evidencePackageService.buildEvidencePackage).toHaveBeenCalledTimes(1);
    expect(result).toBe(fakeResult); // unmodified pass-through, not a re-shaped copy
  });

  it('exposes a stable name/description contract', () => {
    expect(tool.name).toBe('market_data');
    expect(typeof tool.description).toBe('string');
  });
});