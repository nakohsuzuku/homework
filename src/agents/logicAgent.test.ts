import { LogicAgent } from './logicAgent';
import { CodeFile } from '../types';

describe('LogicAgent', () => {
  let logicAgent: LogicAgent;

  beforeEach(() => {
    logicAgent = new LogicAgent();
  });

  describe('checkOffByOne', () => {
    it('should detect off-by-one error with <= and .length', async () => {
      const code = `function calculate(arr) { 
  let total = 0; 
  for (let i = 0; i <= arr.length; i++) { 
    total += arr[i].value; 
  } 
  return total; 
}`;

      const files: CodeFile[] = [{
        filename: 'test.js',
        content: code,
        language: 'js',
      }];

      const issues = await logicAgent.analyze(files);
      
      const offByOneIssues = issues.filter(i => i.message.includes('数组越界'));
      expect(offByOneIssues.length).toBeGreaterThan(0);
      expect(offByOneIssues[0].line).toBe(3);
      expect(offByOneIssues[0].severity).toBe('medium');
    });

    it('should not detect issue when using < instead of <=', async () => {
      const code = `function calculate(arr) { 
  let total = 0; 
  for (let i = 0; i < arr.length; i++) { 
    total += arr[i].value; 
  } 
  return total; 
}`;

      const files: CodeFile[] = [{
        filename: 'test.js',
        content: code,
        language: 'js',
      }];

      const issues = await logicAgent.analyze(files);
      
      const offByOneIssues = issues.filter(i => i.message.includes('数组越界'));
      expect(offByOneIssues.length).toBe(0);
    });
  });

  describe('checkNullReference', () => {
    it('should detect potential null pointer exception', async () => {
      const code = `function process(data) {
  return data.value.name;
}`;

      const files: CodeFile[] = [{
        filename: 'test.js',
        content: code,
        language: 'js',
      }];

      const issues = await logicAgent.analyze(files);
      
      const nullIssues = issues.filter(i => i.message.includes('空指针'));
      expect(nullIssues.length).toBeGreaterThan(0);
    });

    it('should not detect issue when using optional chaining', async () => {
      const code = `function process(data) {
  return data?.value?.name;
}`;

      const files: CodeFile[] = [{
        filename: 'test.js',
        content: code,
        language: 'js',
      }];

      const issues = await logicAgent.analyze(files);
      
      const nullIssues = issues.filter(i => i.message.includes('空指针'));
      expect(nullIssues.length).toBe(0);
    });
  });
});