const http = require('http');

const options = {
  hostname: 'localhost',
  port: 8888,
  path: '/',
  method: 'GET'
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  // Consume response to free memory
  res.resume();
});

req.on('error', error => {
  console.error(error);
});

req.end();
