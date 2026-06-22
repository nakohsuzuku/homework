function processUserData(userInput) {
  const users = ['admin', 'user1', 'user2'];
  
  for (let i = 0; i <= users.length; i++) {
    console.log(users[i].toUpperCase());
  }
  
  const user = getUserById(userInput.id);
  console.log(user.name);
  
  const sql = "SELECT * FROM users WHERE username = '" + userInput.name + "'";
  executeQuery(sql);
  
  const secret = "super_secret_password_123";
  console.log("Secret: " + secret);
  
  eval(userInput.script);
}