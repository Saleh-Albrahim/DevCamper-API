const path = require('path');
const asyncHandler = require('../middleware/async');
const sendEmail = require('../utils/sendEmail');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

// @desc      Register user
// @route     GET /api/v1/auth/register
// @access    Public
exports.registerUsers = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  const user = await User.create({
    name,
    email,
    password,
    role
  });

  sendTokenResponse(user, 200, res);

});

// @desc      Login user
// @route     GET /api/v1/auth/login
// @access    Public
exports.loginUsers = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Check  if email entered and password
  if (!email || !password) {
    return next(new ErrorResponse(`Please enter email and password`, 400));
  }

  // Bring the user from the DB
  const user = await User.findOne({ email }).select('+password');

  // Check if the user exist
  if (!user) {
    return next(new ErrorResponse(`Invalid email or password`, 401));
  }

  // Check the password
  const isMatch = await user.checkPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse(`Invalid email or password`, 401));
  }

  sendTokenResponse(user, 200, res);

});


// @desc      Get the logined user
// @route     GET /api/v1/auth/me
// @access    Private
exports.getMe = asyncHandler(async (req, res, next) => {

  res.status(200).json(
    {
      success: true,
      user: req.user
    }
  );


});


// @desc      Forgot password
// @route     GET /api/v1/auth/forgotpassword
// @access    Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {

  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new ErrorResponse(`There is no user with this email ${req.body.email}`, 400));
  }

  // Get reset token
  const resetToken = user.getResetPasswordToken();


  await user.save({ validateBeforeSave: false });

  // Create reset url
  const resetUrl = `${req.protocol}://${req.get('host')}/api/vi1/resetpassword/${resetToken}`;

  const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

  try {

    await sendEmail({
      email: user.email,
      subject: 'Password reset token',
      message
    });

    res.status(200).json(
      {
        success: true,
        data: 'Email sent'
      });


  }
  catch (err) {
    //console.log(err);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new ErrorResponse('Email could not be sent', 500));
  }


});


const sendTokenResponse = (user, statusCode, res) => {

  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true
  };

  if (process.env.NODE_ENV == 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json(
      {
        success: true,
        token
      }
    );
};






