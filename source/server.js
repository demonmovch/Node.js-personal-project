// Core
import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import connectMongo from 'connect-mongo';
import bodyParser from 'body-parser';
import dg from 'debug';

// Instruments
import { getPassword, NotFoundError } from './helpers';

// Routers
import { auth, staff, customers, products, orders } from './routers';

// Initialize DB connection
import './db';

const app = express();
const debug = dg('server:init');
const MongoStore = connectMongo(session);

const sessionOptions = {
  key: 'isAuthenticated',
  secret: getPassword(),
  resave: false,
  rolling: true,
  saveUninitialized: false,
  store: new MongoStore({ mongooseConnection: mongoose.connection }),
  cookie: {
    httpOnly: true,
    maxAge: 15 * 60 * 1000,
  },
};

app.use(
  bodyParser.json({
    limit: '5kb',
  })
);
app.use(session(sessionOptions));

// change cookie max age for development
if (process.env.NODE_ENV === 'development') {
  sessionOptions.cookie.maxAge = 8 * 60 * 60 * 1000; // 8 hours
}

// secure cookie for production
if (process.env.NODE_ENV === 'production') {
  sessionOptions.cookie.secure = true;
}

// logger
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const body =
      req.method === 'GET' ? 'Body not supported for GET' : JSON.stringify(req.body, null, 2);

    debug(`${req.method}\n${body}`);
    next();
  });
}

// Routers
app.use('/', auth);
app.use('/staff', staff);
app.use('/customers', customers);
app.use('/products', products);
app.use('/orders', orders);
app.use('*', (req, res, next) => {
  const error = new NotFoundError(
    `Can not find right route for method ${req.method} and path ${req.originalUrl}`,
    404
  );
  next(error);
});

if (process.env.NODE_ENV !== 'test') {
  app.use((error, req, res, next) => {
    const { name, message, statusCode } = error;
    const errorMessage = `${name}: ${message}`;

    debug(`Error: ${errorMessage}`);

    const status = statusCode ? statusCode : 500;
    res.status(status).json({ message: message });
  });
}

export { app };
