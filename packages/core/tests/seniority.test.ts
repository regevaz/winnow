import { deriveSeniorityLevel } from '../src/utils/seniority';

describe('deriveSeniorityLevel', () => {
  describe('C-level', () => {
    it('should identify CEO', () => {
      expect(deriveSeniorityLevel('CEO')).toBe('c_level');
      expect(deriveSeniorityLevel('Chief Executive Officer')).toBe('c_level');
    });

    it('should identify CTO', () => {
      expect(deriveSeniorityLevel('CTO')).toBe('c_level');
      expect(deriveSeniorityLevel('Chief Technology Officer')).toBe('c_level');
    });

    it('should identify CFO', () => {
      expect(deriveSeniorityLevel('CFO')).toBe('c_level');
      expect(deriveSeniorityLevel('Chief Financial Officer')).toBe('c_level');
    });

    it('should identify other C-suite roles', () => {
      expect(deriveSeniorityLevel('COO')).toBe('c_level');
      expect(deriveSeniorityLevel('CRO')).toBe('c_level');
      expect(deriveSeniorityLevel('CMO')).toBe('c_level');
      expect(deriveSeniorityLevel('CIO')).toBe('c_level');
      expect(deriveSeniorityLevel('CISO')).toBe('c_level');
    });

    it('should be case-insensitive', () => {
      expect(deriveSeniorityLevel('ceo')).toBe('c_level');
      expect(deriveSeniorityLevel('Chief Technology Officer')).toBe('c_level');
      expect(deriveSeniorityLevel('CHIEF REVENUE OFFICER')).toBe('c_level');
    });
  });

  describe('VP level', () => {
    it('should identify VP', () => {
      expect(deriveSeniorityLevel('VP of Sales')).toBe('vp');
      expect(deriveSeniorityLevel('VP Engineering')).toBe('vp');
    });

    it('should identify Vice President', () => {
      expect(deriveSeniorityLevel('Vice President of Marketing')).toBe('vp');
    });

    it('should identify SVP', () => {
      expect(deriveSeniorityLevel('SVP Marketing')).toBe('vp');
      expect(deriveSeniorityLevel('Senior Vice President')).toBe('vp');
    });

    it('should identify EVP', () => {
      expect(deriveSeniorityLevel('EVP Operations')).toBe('vp');
      expect(deriveSeniorityLevel('Executive Vice President')).toBe('vp');
    });
  });

  describe('Director level', () => {
    it('should identify Director', () => {
      expect(deriveSeniorityLevel('Director of IT')).toBe('director');
      expect(deriveSeniorityLevel('Director of Engineering')).toBe('director');
    });

    it('should identify Senior Director', () => {
      expect(deriveSeniorityLevel('Senior Director of Procurement')).toBe(
        'director',
      );
    });
  });

  describe('Manager level', () => {
    it('should identify Manager', () => {
      expect(deriveSeniorityLevel('Engineering Manager')).toBe('manager');
      expect(deriveSeniorityLevel('IT Manager')).toBe('manager');
    });

    it('should identify Head of', () => {
      expect(deriveSeniorityLevel('Head of DevOps')).toBe('manager');
      expect(deriveSeniorityLevel('Head of Product')).toBe('manager');
    });

    it('should identify Senior Manager', () => {
      expect(deriveSeniorityLevel('Senior Product Manager')).toBe('manager');
    });

    it('should identify Team Lead', () => {
      expect(deriveSeniorityLevel('Team Lead')).toBe('manager');
    });
  });

  describe('Individual contributor', () => {
    it('should identify Software Engineer', () => {
      expect(deriveSeniorityLevel('Software Engineer')).toBe('individual');
      expect(deriveSeniorityLevel('Senior Software Engineer')).toBe(
        'individual',
      );
    });

    it('should identify Account Executive', () => {
      expect(deriveSeniorityLevel('Account Executive')).toBe('individual');
    });

    it('should identify Marketing Specialist', () => {
      expect(deriveSeniorityLevel('Marketing Specialist')).toBe('individual');
    });

    it('should identify Analyst', () => {
      expect(deriveSeniorityLevel('Business Analyst')).toBe('individual');
      expect(deriveSeniorityLevel('Data Analyst')).toBe('individual');
    });
  });

  describe('Unknown', () => {
    it('should return unknown for null', () => {
      expect(deriveSeniorityLevel(null)).toBe('unknown');
    });

    it('should return unknown for empty string', () => {
      expect(deriveSeniorityLevel('')).toBe('unknown');
    });
  });

  describe('Edge cases', () => {
    it('should prioritize c_level over other matches', () => {
      // "Chief" should match c_level even if other keywords present
      expect(deriveSeniorityLevel('Chief Engineering Manager')).toBe(
        'c_level',
      );
    });

    it('should handle titles with extra whitespace', () => {
      expect(deriveSeniorityLevel('  VP of Sales  ')).toBe('vp');
    });

    it('should handle titles with mixed case', () => {
      expect(deriveSeniorityLevel('ViCe PrEsIdEnT')).toBe('vp');
    });
  });
});
