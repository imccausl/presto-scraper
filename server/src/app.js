require('dotenv').config();

const cookieParser = require('cookie-parser');
const cors = require('cors');
const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const { Server } = require('http');
const bodyParser = require('body-parser');

// set up express server
const app = express();
const http = Server(app);

// routes
const userRoutes = require('./resources/user/user.routes');
const prestoRoutes = require('./resources/presto/presto.routes');
const transactionRoutes = require('./resources/transaction/transaction.routes');
const budgetRoutes = require('./resources/budget/budget.routes');
const authControllers = require('./utils/auth');

const { connect, db } = require('./utils/db');

const { User } = db;

const PORT = process.env.PORT || 8080;
const corsOptions = {
  origin: 'https://presto-analytics.herokuapp.com',
  credentials: true
};

// setup db connection
connect();

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '15360mb', type: 'application/json' }));
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);
app.use(cookieParser());

// decode the userId on incoming requests
// if the jwt exists
app.use('/api/v1', async (req, res, next) => {
  try {
    const { auth } = req.cookies;
    const { userId } = jwt.verify(auth, process.env.APP_SECRET);

    if (auth) {
      const user = await User.findByPk(userId);
      req.user = user;
      req.userId = userId;

      next();
    }
  } catch (err) {
    next();
  }
});

app.use(express.static(path.join(__dirname, '../build')));

// routes
app.use('/api/login', authControllers.login);
app.use('/api/logout', authControllers.logout);
app.use('/api/signup', authControllers.signup);

app.use('/api/v1/user', userRoutes);
app.use('/api/v1/presto', prestoRoutes);
app.use('/api/v1/transaction', transactionRoutes);
app.use('/api/v1/budget', budgetRoutes);

// handle errors as json
app.use((err, req, res, next) => {
  res.status(401).send({
    error: 'error',
    message: err.message,
    body: err.stacktrace // for debugging
  });
});

app.get('/', (req, res) => {
  res.send('PrestoAnalytics server running...');
});

http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
