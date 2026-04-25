const http = require('http');

const data = JSON.stringify({ message: 'Hello' });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/ai/assistant',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let resData = '';
  res.on('data', chunk => { resData += chunk; });
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Response: ${resData}`);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
