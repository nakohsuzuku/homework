const fs = require('fs');
const { ReviewService } = require('./dist/services/reviewService');

async function runTestReview() {
  console.log('🔍 模拟 GitHub PR 代码审查流程\n');
  
  const testFile = 'test-problem.js';
  
  if (!fs.existsSync(testFile)) {
    console.error(`❌ 测试文件 ${testFile} 不存在`);
    process.exit(1);
  }

  const content = fs.readFileSync(testFile, 'utf-8');
  
  console.log(`📄 正在审查文件: ${testFile}`);
  console.log('--- 文件内容 ---');
  console.log(content);
  console.log('--- 开始审查 ---\n');

  const reviewService = new ReviewService();
  
  const codeFiles = [{
    filename: testFile,
    content: content,
    language: 'js',
  }];

  const report = await reviewService.performReview('TEST_PR', 'test/repo', codeFiles);

  console.log('📊 审查报告\n');

  const criticalIssues = report.issues.filter(i => i.severity === 'critical');
  const highIssues = report.issues.filter(i => i.severity === 'high');
  const mediumIssues = report.issues.filter(i => i.severity === 'medium');
  const lowIssues = report.issues.filter(i => i.severity === 'low');

  if (criticalIssues.length > 0) {
    console.log(`🔴 严重问题 (${criticalIssues.length})`);
    criticalIssues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue.file}:${issue.line} - ${issue.message}`);
      console.log(`     > ${issue.suggestion}`);
    });
    console.log('');
  }

  if (highIssues.length > 0) {
    console.log(`🟠 高优先级 (${highIssues.length})`);
    highIssues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue.file}:${issue.line} - ${issue.message}`);
      if (issue.suggestion) {
        console.log(`     > ${issue.suggestion}`);
      }
    });
    console.log('');
  }

  if (mediumIssues.length > 0) {
    console.log(`🟡 中等问题 (${mediumIssues.length})`);
    mediumIssues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue.file}:${issue.line} - ${issue.message}`);
      if (issue.suggestion) {
        console.log(`     > ${issue.suggestion}`);
      }
    });
    console.log('');
  }

  if (lowIssues.length > 0) {
    console.log(`🟢 建议改进 (${lowIssues.length})`);
    lowIssues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue.file}:${issue.line} - ${issue.message}`);
      if (issue.suggestion) {
        console.log(`     > ${issue.suggestion}`);
      }
    });
    console.log('');
  }

  if (report.issues.length === 0) {
    console.log('✅ 代码质量良好，没有发现问题！');
  }

  console.log(`\n---\n审查完成 | 共发现 ${report.issues.length} 个问题`);

  if (criticalIssues.length > 0 || highIssues.length > 0) {
    console.log('\n❌ CI 流程将失败，阻止 PR 合并');
    process.exit(1);
  } else {
    console.log('\n✅ CI 流程通过，可以合并 PR');
    process.exit(0);
  }
}

runTestReview().catch(err => {
  console.error('❌ 审查失败:', err);
  process.exit(1);
});