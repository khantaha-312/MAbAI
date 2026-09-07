// src/ai-tools/risk-engine.tool.spec.ts
import { Test } from '@nestjs/testing';
import { RiskEngineTool } from './risk-engine.tool';
import { RiskEngineService } from '../risk-engine/risk-engine.service';

describe('RiskEngineTool', () => {
  let tool: RiskEngineTool;
  let riskEngineService: { getRiskAnalysis: jest.Mock };

  beforeEach(async () => {
    riskEngineService = { getRiskAnalysis: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RiskEngineTool,
        { provide: RiskEngineService, useValue: riskEngineService },
      ],
    }).compile();

    tool = moduleRef.get(RiskEngineTool);
  });

  it('delegates to RiskEngineService.getRiskAnalysis with the right args', async () => {
    const fakeResult = { available: true, severity: { level: 'low', evidenceCount: 2 } } as any;
    riskEngineService.getRiskAnalysis.mockResolvedValue(fakeResult);

    const result = await tool.execute({ portfolioId: 'port-1', userId: 'user-1' });

    expect(riskEngineService.getRiskAnalysis).toHaveBeenCalledWith('port-1', 'user-1');
    expect(riskEngineService.getRiskAnalysis).toHaveBeenCalledTimes(1);
    expect(result).toBe(fakeResult);
  });

  it('never calls evaluatePortfolio (the write-side method)', async () => {
    riskEngineService.getRiskAnalysis.mockResolvedValue({} as any);
    await tool.execute({ portfolioId: 'port-1', userId: 'user-1' });
    expect((riskEngineService as any).evaluatePortfolio).toBeUndefined();
  });
});