// 测试文件：包含各种安全漏洞和逻辑问题

// 1. SQL 注入漏洞 - 严重
function getUserByName(username) {
  const query = "SELECT * FROM users WHERE name = '" + username + "'";
  return db.execute(query);
}

// 2. 硬编码密码 - 严重
const config = {
  apiKey: "sk-1234567890abcdef",
  password: "admin123456",
  secret: "my-super-secret-key-12345"
};

// 3. 命令注入漏洞 - 严重
function runSystemCommand(userInput) {
  const { exec } = require('child_process');
  exec("ls -la " + userInput, (err, stdout) => {
    console.log(stdout);
  });
}

// 4. 路径遍历漏洞 - 高优先级
function readUserFile(filename) {
  const fs = require('fs');
  return fs.readFileSync("./uploads/" + filename);
}

// 5. 不安全的反序列化 - 高优先级
function parseUserData(data) {
  return eval("(" + data + ")");
}

// 6. SSRF 漏洞 - 高优先级
function fetchExternalUrl(url) {
  const http = require('http');
  http.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(data));
  });
}

// 7. 不安全的随机数 - 中等
function generateToken() {
  return Math.random().toString(36).substring(2);
}

// 8. 敏感信息泄露 - 中等
function handleError(err) {
  console.error("数据库连接失败: " + err.stack);
  return { error: err.message, sql: err.sql };
}

// 9. 竞态条件 - 中等
let balance = 1000;
function withdraw(amount) {
  if (balance >= amount) {
    // 模拟延迟
    setTimeout(() => {
      balance -= amount;
    }, 100);
    return true;
  }
  return false;
}

// 10. 不安全的 CORS 配置 - 低
const corsOptions = {
  origin: '*',
  credentials: true
};

module.exports = {
  getUserByName,
  runSystemCommand,
  readUserFile,
  parseUserData,
  fetchExternalUrl,
  generateToken,
  withdraw
};
