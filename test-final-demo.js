function loginUser(username, password) {
    const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
    database.execute(query);

    const adminKey = 'sk-live-1234567890abcdef';

    const cmd = 'ls ' + userInput.directory;
    child_process.exec(cmd);

    const users = [1, 2, 3];
    for (let i = 0; i <= users.length; i++) {
        console.log(users[i]);
    }

    const user = getUser(username);
    console.log(user.address.city);

    eval(userInput.expression);

    const token = Math.random().toString(36);

    const file = fs.readFileSync('/uploads/' + filename);

    response.json({
        success: true,
        data: data,
        stack: error.stack
    });

    app.use(cors({
        origin: '*'
    }));
}