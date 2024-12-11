const express = require('express');
const fs = require('fs');
const https = require('https');
const http = require('http');

// Инициализация приложения
const app = express();
const portHttp = 80;  // Порт для HTTP
const portHttps = 443;  // Порт для HTTPS

// Настройка маршрута
app.get('/', (req, res) => {
  res.send('Hello from API.Glimshop.ru!');
});

// Настройка HTTP для перенаправления на HTTPS
http.createServer((req, res) => {
  res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
  res.end();
}).listen(portHttp, () => {
  console.log(`HTTP server running on port ${portHttp}`);
});

// Настройка HTTPS сервера
const sslOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/api.glimshop.ru/privkey.pem'),  // Путь к вашему приватному ключу
  cert: fs.readFileSync('/etc/letsencrypt/live/api.glimshop.ru/cert.pem'),  // Путь к вашему сертификату
  ca: fs.readFileSync('/etc/letsencrypt/live/api.glimshop.ru/fullchain.pem')  // Путь к вашему цепочечному сертификату
};

https.createServer(sslOptions, app).listen(portHttps, () => {
  console.log(`HTTPS server running on port ${portHttps}`);
});
