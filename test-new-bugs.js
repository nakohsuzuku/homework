// 测试文件：包含多种代码问题

// 🟠 问题1：数组越界
function processItems(items) {
  let result = [];
  for (let i = 0; i <= items.length; i++) {  // ❌ 应该是 < 而不是 <=
    result.push(items[i].name);
  }
  return result;
}

// 🟠 问题2：空指针异常
function getUserName(user) {
  return user.info.name;  // ❌ 没有空值检查
}

// 🟡 问题3：未初始化变量
function calculateTotal() {
  let total;  // ❌ 未初始化
  total += 100;
  return total;
}

// 🟡 问题4：资源泄漏
function loadConfig() {
  const configFile = open('config.json');  // ❌ 没有关闭
  return configFile.read();
}

// 🟡 问题5：全局变量污染
let globalData = {};  // ❌ 应该使用局部变量

function updateData(value) {
  globalData.value = value;
}

// 🟢 问题6：代码风格
function test_function_name() {  // ❌ 不符合 camelCase
  var x = 5;  // ❌ 使用了 var 而不是 let/const
  return x;
}

// 🟢 问题7：缺少注释
function complexLogic(a, b, c) {
  return (a + b) * c / 2;
}