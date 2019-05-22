const jwt = require('jsonwebtoken');
const moment = require('moment');

const Presto = require('../../../lib/presto');
const types = require('../../../lib/util/types');
const { db } = require('../../utils/db');

const { sequelize, Sequelize, User, Transaction } = db;

const me = async (req, res, next) => {
  const thisYear = new Date().getFullYear();
  const thisMonth = new Date().getMonth() + 1;
  const searchDateMin = `${thisYear}-${thisMonth}-01`;
  const searchDateMax =
    thisMonth === '12'
      ? `${parseInt(thisYear, 10) + 1}-01-01`
      : `${thisYear}-${parseInt(thisMonth, 10) + 1}-01`;

  const accountInfo = {};

  try {
    if (!req.userId) {
      throw new Error('No user logged in');
    }

    const user = await User.findOne({
      where: {
        id: req.userId
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'cards', 'permission']
    });

    const balance = user.cards.reduce((sum, curr) => {
      const amount = parseFloat(
        // make it a negative number if there are brackets around it.
        curr.balance
          .replace('$', '')
          .replace('(', '-')
          .replace(')', '')
      );

      return sum + amount;
    }, 0);

    console.log('Card Balance:', balance);

    const budget = await db.budget.findOne({
      where: {
        userId: req.userId
      }
    });

    const currTransactions = await Transaction.findAll({
      where: {
        userId: req.userId,
        type: Sequelize.or('Fare Payment', 'Transit Pass Payment', 'Transfer'),
        date: {
          [Sequelize.Op.gte]: new Date(searchDateMin),
          [Sequelize.Op.lt]: new Date(searchDateMax)
        }
      },
      order: sequelize.literal('date DESC')
    });

    const totalAmount = currTransactions.reduce((sum, trans) => sum + parseFloat(trans.amount), 0);
    const totalTrips = currTransactions.length;

    const today = moment()
      .endOf('month')
      .format('DD/MM/YYYY');
    const lastYear = moment()
      .subtract(1, 'years')
      .startOf('month')
      .format('DD/MM/YYYY');

    const ytd = await Transaction.findAll({
      where: {
        userId: req.userId,
        type: sequelize.or(types.TRANSIT_PASS_LOAD, types.TRANSIT_FARE),
        serviceClass: 'Regular',
        date: {
          [Sequelize.Op.gte]: moment(lastYear, 'DD/MM/YYYY'),
          [Sequelize.Op.lte]: moment(today, 'DD/MM/YYYY')
        }
      },
      attributes: [
        'type',
        [sequelize.literal("SUM(CAST(COALESCE(amount, '0') as float))"), 'total'],
        [sequelize.literal('COUNT(type)'), 'count']
      ],
      group: ['type']
    });

    // console.log(process.env.TEST_USERNAME, process.env.TEST_PASSWORD);
    // const loginStatus = await login(process.env.TEST_USERNAME, process.env.TEST_PASSWORD);
    // console.log(loginStatus);

    // if (loginStatus.success) {
    //   accountInfo = await getBasicAccountInfo();
    // }

    // user.cards = accountInfo || [{ cardNumber: '', balance: '0.00' }];
    // await user.save();

    console.log(`User ${user.firstName} logged in!`);

    res.json({
      status: 'success',
      data: {
        user,
        balance,
        budget,
        ytd,
        currentMonth: { currTransactions, totalAmount, totalTrips }
      }
    });
    next();
  } catch (err) {
    return next(err);
  }
};

const login = async (req, res, next) => {
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

    // create JWT token for logged in user
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    res.cookie('auth', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 356
    });

    res.status(200).json({ status: 'success', data: user });
    next();
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res) => {
  res.clearCookie('auth');
  res.json({ status: 'success', message: 'Logout completed' });
};

const signup = async (req, res, next) => {
  const { body } = req;
  const { firstName, lastName, password, passwordAgain } = body;

  try {
    if (password !== passwordAgain) {
      throw new Error('Passwords do not match!');
    }

    if (!body.email) {
      throw new Error('No email provided.');
    }

    body.email = body.email.toLowerCase();

    const user = await User.create({
      firstName,
      lastName,
      email: body.email,
      password,
      cards: [{}],
      permission: ['USER']
    });

    // create JWT token for logged in user
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    res.cookie('auth', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 356
    });

    res.json({
      status: 'success',
      message: `User ${firstName} ${lastName} created.`,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { me, login, logout, signup };