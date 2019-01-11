const express = require('express');

const { login, getBasicAccountInfo, getActivityByDateRange } = require('../../lib/presto');

const routes = Transaction => {
  const router = express.Router();

  router.post('/login', async (req, res) => {
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

  router.post('/usage', async (req, res) => {
    try {
      const { from, to } = req.body;
      const usage = await getActivityByDateRange(from, new Date().toLocaleDateString());
      // const testUser = await User.findOne({ where: { firstName: 'test' } });

      console.log(`Getting activity from ${from} to ${to || new Date().toLocaleDateString()}...`);
      res.send(usage);
      console.log(`Saving usage to db...`);
      usage.forEach(async transaction => {
        await Transaction.create({
          userId: req.userId,
          date: new Date(transaction.date),
          agency: transaction.agency,
          location: transaction.location,
          type: transaction.type,
          serviceClass: transaction.serviceClass,
          discount: transaction.discount,
          amount: transaction.amount,
          balance: transaction.balance
        });
      });
    } catch (error) {
      res.send({ error });
    }
  });

  return router;
};

module.exports = routes;
