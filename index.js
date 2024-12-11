const express = require('express');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { Client } = require('pg');  
const config = require('./config'); 

const app = express();
const portHttp = 80;  // HTTP
const portHttps = 443;  // HTTPS

const client = new Client(config.dbConfig);

client.connect()
  .then(() => console.log('Подключение к базе данных успешно!'))
  .catch(err => console.error('Ошибка подключения к базе данных:', err));

app.get('/', (req, res) => {
  res.send('Приветствую, сервер работает в штатном режиме!');
});

app.get('/data', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM table');
    res.json(result.rows);  
  } catch (error) {
    console.error('Ошибка при запросе к базе данных:', error);
    res.status(500).json({ error: 'Ошибка при запросе к базе данных' });
  }
});

app.post('/data', express.json(), async (req, res) => {
  const { name, age } = req.body; 
  try {
    const result = await client.query('INSERT INTO table (name, age) VALUES ($1, $2) RETURNING *', [name, age]);
    res.status(201).json(result.rows[0]);  
  } catch (error) {
    console.error('Ошибка при добавлении данных в базу:', error);
    res.status(500).json({ error: 'Ошибка при добавлении данных в базу' });
  }
});

http.createServer((req, res) => {
  res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
  res.end();
}).listen(portHttp, () => {
  console.log(`HTTP запущен на порту - ${portHttp}`);
});

const sslOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/api.glimshop.ru/privkey.pem'), 
  cert: fs.readFileSync('/etc/letsencrypt/live/api.glimshop.ru/cert.pem'), 
  ca: fs.readFileSync('/etc/letsencrypt/live/api.glimshop.ru/fullchain.pem')
};

https.createServer(sslOptions, app).listen(portHttps, () => {
  console.log(`HTTPS запущен на порту - ${portHttps}`);
});
