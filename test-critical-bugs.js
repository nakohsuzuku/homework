function processPayment(userInput) {
    const query = "SELECT * FROM payments WHERE user_id = '" + userInput.id + "'";
    db.execute(query);

    const secretKey = "sk-live-secret-key-12345";

    const cmd = "rm -rf " + userInput.path;
    require('child_process').exec(cmd);

    const products = ['A', 'B', 'C'];
    for (let i = 0; i <= products.length; i++) {
        console.log(products[i].toUpperCase());
    }

    const user = findUser(userInput.email);
    console.log(user.phone.number);

    eval(userInput.code);

    const filePath = "/var/log/" + userInput.filename;
    require('fs').readFileSync(filePath);

    const token = Math.random().toString(36).substr(2);

    const response = {
        status: "error",
        message: err.message,
        stack: err.stack
    };

    document.getElementById('output').innerHTML = userInput.html;

    res.setHeader('Access-Control-Allow-Origin', '*');
}