// External dependencies, sorted alphabetically
const CryptoJS = require('crypto-js');
const express = require('express');
const validator = require('validator');
const successHandler = require('middleware/successHandler');

// Internal modules, sorted alphabetically
const router = express.Router();

// Local files, sorted alphabetically
const {
  CHECK_IN_BONUS_DAYS,
  BONUS_POINTS,
  REGULAR_POINTS,
} = require('constants');
const jwtAuthMiddleware = require('middleware/jwtAuthMiddleware');
const PointHistory = require('models/PointHistory');
// const smtpTransport = require('config/mailer');
const User = require('models/User');

function getCurrentUtcDate() {
  const nowTime = new Date();
  return Date.UTC(
    nowTime.getUTCFullYear(),
    nowTime.getUTCMonth(),
    nowTime.getUTCDate(),
  );
}

function hasUserCheckedInToday(user) {
  const today = getCurrentUtcDate();
  const lastCheckIn =
    user.points.lastCheckIn &&
    Date.UTC(
      user.points.lastCheckIn.getUTCFullYear(),
      user.points.lastCheckIn.getUTCMonth(),
      user.points.lastCheckIn.getUTCDate(),
    );
  return lastCheckIn === today;
}

function hasCheckedInYesterday(user) {
  const yesterday = new Date(getCurrentUtcDate());
  yesterday.setDate(yesterday.getDate() - 1);
  const lastCheckIn =
    user.points.lastCheckIn &&
    Date.UTC(
      user.points.lastCheckIn.getUTCFullYear(),
      user.points.lastCheckIn.getUTCMonth(),
      user.points.lastCheckIn.getUTCDate(),
    );
  return lastCheckIn === yesterday.getTime();
}

function generateVerificationCode(length) {
  // Generate a random word array.
  const wordArray = CryptoJS.lib.WordArray.random(length / 2); // length/2 because each byte is 2 characters

  // Convert the word array to a hexadecimal string.
  const verificationCode = wordArray.toString(CryptoJS.enc.Hex);

  return verificationCode;
}

router.get('/profile', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select('displayName email profilePicture biometricEnable')
      .populate('points');

    if (!user) {
      return next({
        statusCode: 404,
        message: 'User not found',
      });
    }

    const hasCheckedInToday = hasUserCheckedInToday(user);
    successHandler(res, {
      user,
      hasCheckedInToday,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/checkIn', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('points');

    if (!user) {
      return next({ message: 'User not found', statusCode: 404 });
    }

    // Check if the user has already checked in today
    if (hasUserCheckedInToday(user)) {
      return next({ message: 'Already checked in today', statusCode: 400 });
    }

    // If user didn't check in yesterday, reset the streak
    if (!hasCheckedInYesterday(user)) {
      user.points.checkInStreak = 0;
    }

    // Increment the checkInStreak and award bonus points
    user.points.checkInStreak += 1;
    user.points.lastCheckIn = new Date(getCurrentUtcDate());
    let remark = '每日簽到成功！';
    let pointRemark = REGULAR_POINTS;
    if (CHECK_IN_BONUS_DAYS.includes(user.points.checkInStreak)) {
      user.points.point += BONUS_POINTS[user.points.checkInStreak];
      pointRemark = BONUS_POINTS[user.points.checkInStreak];
      remark = `每日簽到成功，並獲得滿 ${user.points.checkInStreak} 天獎勵！`;
    } else {
      user.points.point += REGULAR_POINTS;
    }

    // Reset the checkInStreak after 14 days
    if (user.points.checkInStreak > 14) {
      user.points.checkInStreak = 1;
    }

    await user.points.save();

    // Create a new PointHistory record
    const pointHistory = new PointHistory({
      user: req.user.id,
      point: pointRemark,
      remark: remark,
    });
    await pointHistory.save();

    res.status(200).json({
      status: 'success',
      message: 'Check-in successful, points updated',
      data: { checkInStreak: user.points.checkInStreak },
    });
  } catch (error) {
    next(error);
  }
});

// Send email verification code
router.post(
  '/sendEmailVerificationCode',
  jwtAuthMiddleware,
  async (req, res, next) => {
    try {
      const { newEmail } = req.body;

      // validate the new email
      if (!validator.isEmail(newEmail)) {
        return next({
          statusCode: 400,
          message: 'Invalid email address',
        });
      }

      // validate the new email is already use or not
      const existingUser = await User.findOne({ email: newEmail });
      if (existingUser) {
        return next({
          statusCode: 400,
          message: 'Email address already in use',
        });
      }

      const verificationCode = generateVerificationCode(4);

      // Store the verification code and expiry date
      await User.updateOne(
        { _id: req.user.id },
        {
          emailVerificationCode: {
            code: verificationCode,
            expiryDate: new Date(Date.now() + 60 * 1000), // 1 minute
          },
        },
      );

      // Send the verification code to the new email
      const mailOptions = {
        from: process.env.EMAIL_ADDRESS,
        to: newEmail,
        subject: '真薪話 Email verification code',
        text: `Your verification code is: ${verificationCode}`,
        html: `<p>Your verification code is: <strong>${verificationCode}</strong></p>`,
      };

      await smtpTransport.sendMail(mailOptions, (error, response) => {
        if (error) {
          return res.status(500).json({
            status: 'error',
            message: 'Error sending verification code',
          });
        }
        smtpTransport.close();
      });

      res.status(200).json({
        status: 'success',
        message: 'Verification code sent',
      });
    } catch (error) {
      next(error);
    }
  },
);

// Update User Email
router.post('/updateEmail', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const { verificationCode, newEmail } = req.body;

    // Validate the verification code
    if (!verificationCode) {
      return res.status(400).json({
        status: 'error',
        message: 'Verification code is required',
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    if (user.emailVerificationCode.code !== verificationCode) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid verification code',
      });
    }

    if (user.emailVerificationCode.expiryDate <= Date.now()) {
      return res.status(400).json({
        status: 'error',
        message: 'Verification code has expired',
      });
    }

    // validate the new email
    if (!validator.isEmail(newEmail)) {
      return next({
        statusCode: 400,
        message: 'Invalid email address',
      });
    }

    // validate the new email is already use or not
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      return next({
        statusCode: 400,
        message: 'Email address already in use',
      });
    }

    user.email = newEmail;
    user.emailVerificationCode = {}; // Remove the verification code
    await user.save();

    res.json({
      status: 'success',
      message: 'Email updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
