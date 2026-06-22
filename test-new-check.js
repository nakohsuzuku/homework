function getUserOrders(userId) {
    const dbConfig = {
        host: 'localhost',
        user: 'admin',
        password: 'password123'
    };
    
    const query = `SELECT * FROM orders WHERE user_id = ${userId}`;
    
    const users = ['Alice', 'Bob', 'Charlie'];
    for (let i = 0; i <= users.length; i++) {
        console.log(users[i].length);
    }
    
    const apiKey = 'sk-xxxxxxxxxxxxxxxxxxxxxxxx';
    
    const userData = fetchUserData(userId);
    console.log(userData.profile.email);
    
    const filePath = '/tmp/' + userId + '.json';
    fs.readFileSync(filePath);
    
    eval(userInput.script);
    
    const randomToken = Math.random().toString(36);
    
    const response = {
        status: 'success',
        data: userData,
        error: err.message
    };
    
    res.setHeader('Access-Control-Allow-Origin', '*');
}