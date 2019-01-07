require('dotenv').config();

const express = require('express');
const { Server } = require('http');
const bodyParser = require('body-parser');
const Sequelize = require('sequelize');

const { login, isLoggedIn, getBasicAccountInfo, getUsageReport } = require('../presto');
const dbConfig = require('./db/config');

const router = express.Router();
const app = express();
const http = Server(app);
const sequelize = new Sequelize('analytics', 'postgres', 'postgres', dbConfig);

const User = require('./db/models/user')(sequelize, Sequelize);
const Transaction = require('./db/models/transaction')(sequelize, Sequelize, User);

const PORT = process.env.SERVER_PORT || 3333;

sequelize
  .sync({ force: true })
  .then(() => console.log('Database and tables created!'))
  .catch(err => console.log('Error:', err));

User.hasMany(Transaction, { foreignKey: 'userId', sourceKey: 'id' });

// Express Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/api/v1', router);

// Routes for app:
router.get('/transactions/:year/:month', async (req, res) => {
  const searchDateMin = `${req.params.year}-${req.params.month}-01`;
  const searchDateMax =
    req.params.month === '12' ? `${parseInt(req.params.year, 10) + 1}-01-01` : `${req.params.year}-${parseInt(req.params.month, 10) + 1}-01`;

  const transactions = await Transaction.findAll({
    where: {
      userId: 1,
      date: {
        [Sequelize.Op.gte]: new Date(searchDateMin),
        [Sequelize.Op.lt]: new Date(searchDateMax)
      }
    },
    order: sequelize.literal('date ASC')
  });

  const totalAmount = transactions.reduce((sum, trans) => sum + parseFloat(trans.amount), 0);
  const totalTrips = transactions.length;

  res.json({ status: 'success', data: { transactions, totalTrips, totalAmount } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({
      where: {
        email
      }
    });

    if (!user) {
      throw new Error("User doesn't exist");
    }
    const isPasswordValid = await user.validatePassword(password);

    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    res.json({ status: 'success', data: user });
  } catch (err) {
    res.json({ status: 'failed', error: err });
  }
});
router.post('/signup', async (req, res) => {
  const { body } = req;
  const { firstName, lastName, password } = body;

  body.email = body.email.toLowerCase();

  try {
    const user = await User.create({
      firstName,
      lastName,
      email: body.email,
      password,
      permission: ['USER']
    });

    res.json({ status: 'success', message: `User ${firstName} ${lastName} created.`, data: user });
  } catch (err) {
    res.json({ status: 'error', error: err });
  }
});

// Routes for grabbing presto data:
router.post('/presto/login', async (req, res) => {
  const prestoCredentials = req.body;

  if (!prestoCredentials.username && !prestoCredentials.password) {
    res.sendStatus(500);
    console.log('Invalid request body.');
    return;
  }

  try {
    const prestoLoginResp = await login(prestoCredentials.username, prestoCredentials.password);
    const accountInfo = await getBasicAccountInfo();
    console.log(prestoLoginResp);
    res.send(accountInfo);
  } catch (error) {
    res.send({ error });
  }
});

router.get('/presto/usage/:year', async (req, res) => {
  try {
    const usage = await getUsageReport(req.params.year);
    // const testUser = await User.findOne({ where: { firstName: 'test' } });

    console.log(`Getting usage report for ${req.params.year}...`);
    res.send(usage);
    console.log(`Saving usage to db...`);
    usage.forEach(async transaction => {
      await Transaction.create({
        userId: 1,
        date: new Date(transaction.date),
        agency: transaction.agency,
        location: transaction.location,
        type: transaction.type,
        amount: transaction.amount.replace(/[($)]/g, '')
      });
    });
  } catch (error) {
    res.send({ error });
  }
});

app.get('/', (req, res) => {
  res.send('PrestoAnalytics server running...');
});

http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
