import { mapStageCategory } from '../mappers/stage-category.mapper';

describe('mapStageCategory', () => {
  describe('closed stages', () => {
    it('returns closed_won when isClosed and isWon', () => {
      expect(mapStageCategory('Won', 100, true, true)).toBe('closed_won');
    });

    it('returns closed_lost when isClosed and not isWon', () => {
      expect(mapStageCategory('Lost', 0, true, false)).toBe('closed_lost');
    });
  });

  describe('keyword matching', () => {
    it('matches contract stage to closing', () => {
      expect(mapStageCategory('Contract Review', 70, false, false)).toBe('closing');
    });

    it('matches legal stage to closing', () => {
      expect(mapStageCategory('Legal Review', 80, false, false)).toBe('closing');
    });

    it('matches proposal stage to proposal', () => {
      expect(mapStageCategory('Proposal Sent', 50, false, false)).toBe('proposal');
    });

    it('matches negotiation stage to proposal', () => {
      expect(mapStageCategory('Negotiation', 60, false, false)).toBe('proposal');
    });

    it('matches demo stage to evaluation', () => {
      expect(mapStageCategory('Demo Scheduled', 40, false, false)).toBe('evaluation');
    });

    it('matches poc stage to evaluation', () => {
      expect(mapStageCategory('POC', 35, false, false)).toBe('evaluation');
    });

    it('matches discovery stage to qualification', () => {
      expect(mapStageCategory('Discovery', 20, false, false)).toBe('qualification');
    });

    it('matches MQL stage to qualification', () => {
      expect(mapStageCategory('MQL', 10, false, false)).toBe('qualification');
    });
  });

  describe('probability fallback', () => {
    it('maps probability >= 80 to closing', () => {
      expect(mapStageCategory('Unknown Stage', 85, false, false)).toBe('closing');
    });

    it('maps probability >= 50 to proposal', () => {
      expect(mapStageCategory('Unknown Stage', 60, false, false)).toBe('proposal');
    });

    it('maps probability >= 20 to evaluation', () => {
      expect(mapStageCategory('Unknown Stage', 30, false, false)).toBe('evaluation');
    });

    it('maps probability < 20 to qualification', () => {
      expect(mapStageCategory('Unknown Stage', 10, false, false)).toBe('qualification');
    });
  });
});
