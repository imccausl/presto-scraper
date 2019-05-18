const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const nock = require('nock');
const req = require('request');

const API = require('../data/nockApiEndpoints');
const Mock = require('../data/fakeServerResponses');

const options = { baseUrl: API.baseUrl };
const request = promisify(req.defaults(options));
const cj = request.jar();

const { ParseError } = require('../../errors');
const { parseCardActivity } = require('../../activity');

describe('parseCardActivity()', () => {
  const readFile = promisify(fs.readFile);
  const filePath = path.join(__dirname, '../data/pages/card-activity.html');
  const expectedCardActivity = [
    {
      agency: 'Toronto Transit Commission',
      amount: '3.10',
      balance: '3.85',
      cardNumber: '3139856309122658',
      date: '4/30/2019 8:08:43 PM',
      discount: '0.00',
      location: 'BAY STATION',
      serviceClass: 'Regular',
      type: 'Fare Payment'
    },
    {
      agency: 'Toronto Transit Commission',
      amount: '3.10',
      balance: '6.95',
      cardNumber: '3139856309122658',
      date: '4/30/2019 7:29:56 AM',
      discount: '0.00',
      location: 'PAPE STATION',
      serviceClass: 'Regular',
      type: 'Fare Payment'
    },
    {
      agency: 'Toronto Transit Commission',
      amount: '3.10',
      balance: '10.05',
      cardNumber: '3139856309122658',
      date: '4/29/2019 5:28:57 PM',
      discount: '0.00',
      location: 'BAY STATION',
      serviceClass: 'Regular',
      type: 'Fare Payment'
    },
    {
      agency: 'Toronto Transit Commission',
      amount: '3.10',
      balance: '13.15',
      cardNumber: '3139856309122658',
      date: '4/29/2019 7:41:19 AM',
      discount: '0.00',
      location: 'PAPE STATION',
      serviceClass: 'Regular',
      type: 'Fare Payment'
    },
    {
      agency: 'Toronto Transit Commission',
      amount: '3.10',
      balance: '16.25',
      cardNumber: '3139856309122658',
      date: '4/27/2019 2:34:19 PM',
      discount: '0.00',
      location: 'ST CLAIR WEST STATION',
      serviceClass: 'Regular',
      type: 'Fare Payment'
    },
    {
      agency: 'Toronto Transit Commission',
      amount: '3.10',
      balance: '19.35',
      cardNumber: '3139856309122658',
      date: '4/27/2019 11:42:28 AM',
      discount: '0.00',
      location: 'PAPE STATION',
      serviceClass: 'Regular',
      type: 'Fare Payment'
    },
    {
      agency: 'Toronto Transit Commission',
      amount: '3.10',
      balance: '22.45',
      cardNumber: '3139856309122658',
      date: '4/26/2019 7:43:47 PM',
      discount: '0.00',
      location: 'BAY STATION',
      serviceClass: 'Regular',
      type: 'Fare Payment'
    },
    {
      agency: 'Toronto Transit Commission',
      amount: '3.10',
      balance: '25.55',
      cardNumber: '3139856309122658',
      date: '4/26/2019 7:31:55 AM',
      discount: '0.00',
      location: 'PAPE STATION',
      serviceClass: 'Regular',
      type: 'Fare Payment'
    },
    {
      agency: 'Toronto Transit Commission',
      amount: '3.10',
      balance: '28.65',
      cardNumber: '3139856309122658',
      date: '4/25/2019 5:56:48 PM',
      discount: '0.00',
      location: 'BAY STATION',
      serviceClass: 'Regular',
      type: 'Fare Payment'
    },
    {
      agency: 'Toronto Transit Commission',
      amount: '30.00',
      balance: '0.00',
      cardNumber: '3139856309122658',
      date: '4/25/2019 5:56:19 PM',
      discount: '0.00',
      location: 'BAY STATION',
      serviceClass: '',
      type: 'Payment By Credit'
    }
  ];

  test('return a JSON formatted object if all card activity on page', async () => {
    const html = await readFile(filePath, 'utf-8');
    const scrapedData = parseCardActivity(html, '3139856309122658');

    expect(scrapedData).toStrictEqual(expectedCardActivity);
  });

  test('should throw ParseError if required selector a.fareMediaID is missing', () => {
    const parseErrorTest = () => {
      getCardsAndBalances(Mock.homepage);
    };
    expect(parseErrorTest).toThrow(new ParseError('FAILURE'));
  });

  test('should throw ParseError if required selector "#cardNumber" and/or ".dashboard__quantity" is missing', () => {
    const parseErrorTest = () => {
      getCardsAndBalances(Mock.dashboard);
    };

    expect(parseErrorTest).toThrow(new ParseError('FAILURE'));
  });
});
