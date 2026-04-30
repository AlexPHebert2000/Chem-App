require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const http = require('http');
const fs = require('fs');
const path = require('path');

const token = process.argv[2] || process.env.EXPORT_TOKEN;

if (!token) {
  console.error('Usage:  npm run export:csv -- <jwt_token>');
  console.error('   or:  EXPORT_TOKEN=<jwt> npm run export:csv');
  process.exit(1);
}

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/courses/export',
  method: 'GET',
  headers: { Authorization: `Bearer ${token}` },
};

const req = http.request(options, (res) => {
  if (res.statusCode !== 200) {
    let body = '';
    res.on('data', chunk => (body += chunk));
    res.on('end', () => {
      console.error(`Error ${res.statusCode}: ${body}`);
      process.exit(1);
    });
    return;
  }

  const date = new Date().toISOString().slice(0, 10);
  const outPath = path.join(__dirname, '..', `student-report-${date}.csv`);
  const out = fs.createWriteStream(outPath);
  res.pipe(out);
  out.on('finish', () => console.log(`Saved: ${outPath}`));
});

req.on('error', (e) => {
  console.error(`Request failed: ${e.message}`);
  console.error('Is the server running on port 3001?');
  process.exit(1);
});

req.end();
