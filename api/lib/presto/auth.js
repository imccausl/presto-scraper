const jsdom = require('jsdom');
const API = require('./api_endpoints');
const { AuthError } = require('./errors');

const { JSDOM } = jsdom;

const authErrors = {
  INVALID_LOGIN:
    'You could not be signed in to your account. Please check your username/email and password and try again.',
  ATTEMPT_LIMIT_EXCEEDED:
    'You have exceeded the number of available attempts to sign in. Please reset your password to access your account.'
};

const parseAuthError = error => {
  let errorType = '';

  if (typeof error !== 'string') {
    throw new AuthError('An unexpected error occurred');
  }

  Object.keys(authErrors).forEach(key => {
    if (authErrors[key] === error) {
      errorType = key;
    }
  });

  return errorType;
};

function isSuccessfulLogin(requestBody) {
  return (
    Object.prototype.hasOwnProperty.call(requestBody, 'Result') && requestBody.Result === 'success'
  );
}

const getCSRF = async (
  requestInstance,
  cookieJar,
  endpoint = API.homepage,
  parent = '#signwithaccount'
) => {
  const response = await requestInstance({ uri: endpoint, jar: cookieJar });
  const dom = new JSDOM(response.body);

  const token = dom.window.document.querySelector(
    `${parent} input[name='__RequestVerificationToken']`
  );

  if (!token) {
    if (parent === '#signwithaccount') {
      throw new AuthError('Login CSRF token not found');
    }

    throw new AuthError('Not logged in');
  }

  if (token && !token.hasAttribute('value')) {
    throw new AuthError('Cannot find correct CSRF token');
  }

  return { token: token.value };
};

async function checkLogin(requestInstance) {
  try {
    const response = await requestInstance({ uri: API.dashboard, jar: this.cookieJar });
    const dom = new JSDOM(response.body);
    const isLoggedIn = dom.window.document.querySelector('.signInright');

    let message = 'User is logged in';
    let result = 'success';

    if (!isLoggedIn) {
      result = 'failed';
      message = 'User is not logged in';
    }

    return { Result: result, message };
  } catch (err) {
    throw err;
  }
}

async function login(requestInstance, username, password) {
  try {
    const CSRFResponse = await getCSRF(requestInstance, this.cookieJar);
    const loginResponse = await requestInstance({
      uri: API.loginEndpoint,
      jar: this.cookieJar,
      method: 'POST',
      json: {
        anonymousOrderACard: false,
        custSecurity: {
          Login: username,
          Password: password,
          __RequestVerificationToken: CSRFResponse.token
        }
      },
      headers: {
        __RequestVerificationToken: CSRFResponse.token,
        'Accept-Language': 'en-US,en;q=0.5',
        'Content-Type': 'application/json; charset=utf-8',
        Referrer: 'https://www.prestocard.ca/home',
        'User-Agent':
          'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:64.0) Gecko/20100101 Firefox/64.0',
        'X-Requested-With': 'XMLHttpRequest',
        Accept: '*/*',
        Connection: 'keep-alive'
      }
    });

    if (!isSuccessfulLogin(loginResponse.body)) {
      return {
        Result: 'failed',
        message: parseAuthError(loginResponse.body)
      };
    }

    return { Result: 'success', cards: await this.getBasicAccountInfo() };
  } catch (err) {
    if (err.constructor === AuthError) {
      throw err;
    }

    throw new AuthError(`Could not log in: ${err.message}`);
  }
}

function createCookieJar(requestInstance) {
  return requestInstance.jar();
}

module.exports = {
  createCookieJar,
  checkLogin,
  isSuccessfulLogin,
  getCSRF,
  login,
  authErrors
};
