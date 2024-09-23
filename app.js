const express = require('express');
const colors = require('colors');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const fileUpload = require('express-fileupload'); 
const createError = require('http-errors');
const exphbs = require('express-handlebars');
const { connectDB } = require('./config/connection'); // Correctly import connectDB
const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin');
var session=require('express-session')


const app = express();

// Connect to MongoDB
connectDB().then(() => {
  console.log('Database connection successful');

  // View engine setup
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'hbs');
  app.engine('hbs', exphbs.engine({
    extname: 'hbs',
    defaultLayout: 'layout',
    layoutsDir: `${__dirname}/views/layout/`,
    partialsDir: `${__dirname}/views/partials/`
  }));

  app.use(logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));

  // Apply fileUpload middleware
  app.use(fileUpload());
  app.use(session({secret:"mayoo",cookie:{maxAge:600000}}))

  // Define routes
  app.use('/', userRouter);
  app.use('/admin', adminRouter);

  // Catch 404 and forward to error handler
  app.use((req, res, next) => {
    next(createError(404));
  });

  // Error handler
  app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    res.status(err.status || 500);
    res.render('error');
  });
}).catch((err) => {
  console.error('Failed to connect to the database:', err);
  process.exit(1); // Exit the application if the database connection fails
});

module.exports = app;
