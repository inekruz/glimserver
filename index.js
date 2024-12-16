const express = require('express');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { Client } = require('pg');  
const crypto = require('crypto');
const bodyParser = require('body-parser');
const config = require('./config'); 
const cors = require('cors');
const app = express();
const axios = require('axios');
const portHttp = 80;  // HTTP
const portHttps = 443;  // HTTPS

const client = new Client(config.dbConfig);

// ключ
const secretKey = 'jFfh23-fh3ri8-JF73ry-shf32r';

client.connect()
  .then(() => console.log('Подключение к базе данных успешно!'))
  .catch(err => console.error('Ошибка подключения к базе данных:', err));

  const categories = ['Еда', 'Книги', 'Посуда', 'Аксессуары', 'Электроника', 'Одежда', 'Игрушки', 'Спорт', 'Косметика'];
  
  // Функция для генерации случайного пароля
  function generateRandomPassword(length = 10) {
      return crypto.randomBytes(length).toString('hex').slice(0, length); // Генерация случайного пароля
  }
  
  // Функция для добавления пользователя
  async function addUser(login, fullname, address, phone_number, password, role) {
      const hashedPassword = hashPassword(password); // Предполагается, что у вас есть функция для хеширования паролей
      const roleValue = role === 'Продавец' ? 1 : 0;
  
      const query = 'INSERT INTO Users (login, fullname, address, phone_number, password, role) VALUES ($1, $2, $3, $4, $5, $6)';
      await client.query(query, [login, fullname, address, phone_number, hashedPassword, roleValue]);
      console.log(`Пользователь добавлен: ${login}`);
  }
  
  // Функция для генерации товаров
  async function generateProducts(count) {
      try {

          // Генерируем пользователей
          const users = [];
          for (let i = 0; i < 5; i++) { // Генерируем 5 пользователей
              const login = `user${i + 1}`;
              const fullname = `Пользователь ${i + 1}`;
              const address = `Адрес ${i + 1}`;
              const phone_number = `+7 900 000 00 0${i + 1}`;
              const password = generateRandomPassword(10); // Генерация случайного пароля длиной 10 символов
              const role = 'Продавец'; // Чередуем роли
  
              await addUser (login, fullname, address, phone_number, password, role);
              users.push(login); // Сохраняем логины добавленных пользователей
          }
  
          // Генерируем товары
          for (let i = 0; i < count; i++) {
              // Получаем случайные данные о товаре
              const response = await axios.get('https://fakerapi.it/api/v1/products?_quantity=1');
              const product = response.data.data[0];
  
              // Подготовка данных для вставки
              const name = product.name;
              const price = parseFloat((Math.random() * 1000).toFixed(2)); // Генерация случайной цены
              const user_key = users[Math.floor(Math.random() * users.length)]; // Случайный логин пользователя из добавленных
              const category = product.category || categories[Math.floor(Math.random() * categories.length)]; // Используем категорию из API или случайную категорию
              const photo_id = null; // Или укажите ID изображения, если у вас есть
  
              // Вставка товара в базу данных
              const query = 'INSERT INTO Products (name, price, user_key, category, photo_id) VALUES ($1, $2, $3, $4, $5)';
              await client.query(query, [name, price, user_key, category, photo_id]);
  
              console.log(`Товар добавлен: ${name}, Цена: ${price} ₽, Категория: ${category}, Пользователь: ${user_key}`);
          }
  
          console.log('Генерация товаров завершена!');
      } catch (error) {
          console.error('Ошибка:', error);
      } finally {
          await client.end(); // Отключаемся от базы данных после завершения всех операций
      }
  }

generateProducts(1000);
app.use(bodyParser.json());
app.use(cors());

app.get('/', (req, res) => {
  res.send('Приветствую, сервер работает в штатном режиме!');
});

// хеширование
function hashPassword(password) {
  return crypto.createHash('md5').update(password + secretKey).digest('hex');
}

// добавление пользователя
app.post('/addUser', async (req, res) => {
  const { login, fullname, address, phone_number, password, role } = req.body;

  // проверка на уникальность логина
  try {
    const checkQuery = 'SELECT * FROM Users WHERE login = $1';
    const checkResult = await client.query(checkQuery, [login]);

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: 'Такой логин уже существует!' });
    }
  } catch (error) {
    console.error('Ошибка при проверке логина:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }

  const hashedPassword = hashPassword(password);

  const roleValue = role === 'Продавец' ? 1 : 0;

  try {
    const query = 'INSERT INTO Users (login, fullname, address, phone_number, password, role) VALUES ($1, $2, $3, $4, $5, $6)';
    await client.query(query, [login, fullname, address, phone_number, hashedPassword, roleValue]);
    res.status(201).json({ message: 'Пользователь успешно добавлен' });
  } catch (error) {
    console.error('Ошибка при добавлении пользователя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Вход пользователя
app.post('/login', async (req, res) => {
  const { login, password } = req.body;
  const hashedPassword = hashPassword(password);

  try {
    const query = 'SELECT * FROM Users WHERE login = $1 AND password = $2';
    const result = await client.query(query, [login, hashedPassword]);

    if (result.rows.length > 0) {
     
      res.status(200).json({ message: 'Вход выполнен успешно!' });
    } else {
      
      res.status(401).json({ error: 'Неверный логин или пароль!' });
    }
  } catch (error) {
    console.error('Ошибка при входе:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получения списка всех товаров
app.post('/getProducts', async (req, res) => {
  try {
    const query = 'SELECT * FROM Products';
    const result = await client.query(query);

    if (result.rows.length > 0) {
      res.status(200).json(result.rows);
    } else {
      res.status(404).json({ message: 'Товары не найдены!' });
    }
  } catch (error) {
    console.error('Ошибка при получении товаров:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
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