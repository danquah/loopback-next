// Copyright IBM Corp. 2014,2015. All Rights Reserved.
// Node module: loopback-example-passport
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
'use strict';

/**
 * NOTE: This express web app helps to mock client HTTP sessions
 * with user profiles from third party providers.
 */
const express = require('express');
const session = require('client-sessions');
const path = require('path');
const bodyParser = require('body-parser');
const app = (module.exports = express());

/**
 * use jade as view engine
 * Note: jade templates copied from loopback-example-passport
 */
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// to support json payload in body
app.use('parse', bodyParser.json());
// to support html form bodies
app.use(bodyParser.text({type: 'text/html'}));
// create application/x-www-form-urlencoded parser
const urlencodedParser = bodyParser.urlencoded({extended: false});

/**
 * we use 'client-sessions' to enable saving client side sessions
 */
app.use(
  session({
    cookieName: 'session',
    secret: 'random_string_goes_here',
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000,
  }),
);

/**
 * Middleware to look up user profile in the session
 */
app.use(function (req, res, next) {
  if (req.session && req.session.user) {
    req.user = req.session.user;
    next();
  } else {
    next();
  }
});

/**
 * Middleware to enforce login
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
function requireLogin(req, res, next) {
  if (!req.user) {
    res.sendStatus(401);
  } else {
    next();
  }
}

/**
 * Render Index page
 */
app.get('/', function (req, res, next) {
  res.render('pages/index', {user: req.user, url: req.url});
});

/**
 * Render account profile
 */
app.get('/auth/account', requireLogin, function (req, res, next) {
  res.render('pages/loginProfiles', {
    user: req.user,
    url: req.url,
  });
});

/**
 * render login page
 */
app.get('/login', function (req, res, next) {
  res.render('pages/login', {
    user: req.user,
    url: req.url,
  });
});

/**
 * logout current session
 */
app.get('/logout', function (req, res) {
  req.session.reset();
  res.redirect('/');
});

/**
 * signup as local user
 */
app.get('/signupOptions', function (req, res, next) {
  res.render('pages/signupOptions', {
    user: req.user,
    url: req.url,
  });
});

/**
 * render login page
 */
app.get('/signup', function (req, res, next) {
  res.render('pages/signup', {
    user: req.user,
    url: req.url,
  });
});

/**
 * submit signup request
 */
app.post('/signup', urlencodedParser, function (req, res, next) {
  req.url = '/api/users/signup';
  req.headers['accept'] = 'text/json';
  req.app.handle(req, res, next);
});

/**
 * login submit
 */
app.post('/login_submit', urlencodedParser, function (req, res, next) {
  req.url = '/api/login';
  req.headers['accept'] = 'text/json';
  req.app.handle(req, res, next);
});
