const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const base64url = require('base64url');
const config = require('config');
const jwt = require('jsonwebtoken');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const User = require('models/User');
const jwtAuthMiddleware = require('middleware/jwtAuthMiddleware');

router.post('/logout', jwtAuthMiddleware, async (req, res, next) => {
  try {
    // record logout timestamp
    await User.findByIdAndUpdate(req.user.id, {
      logoutTimestamp: new Date(),
    });

    res.status(200).json({
      status: 'success',
      message: 'User logged out successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
});

// Toggle Biometric
router.put('/toggleBiometric', jwtAuthMiddleware, async (req, res, next) => {
  const user = req.user;

  try {
    user.biometricEnable = req.body.enable; // Enable or disable biometric login
    if (!req.body.enable) user.credentials = []; // Remove all stored credentials when disabling
    await user.save();

    res.status(200).json({
      status: 'success',
      message: req.body.enable
        ? 'Biometric enabled successfully'
        : 'Biometric disabled successfully',
      data: {
        biometricEnable: user.biometricEnable,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 1. generate attestation options for user register biometric
router.post(
  '/generateAttestation',
  jwtAuthMiddleware,
  async (req, res, next) => {
    try {
      const { isAndroid } = req.body;
      const user = await User.findById(req.user.id);

      if (!user) {
        return res
          .status(404)
          .json({ status: 'error', message: 'User not found' });
      }

      // check if user has enabled biometric
      if (!user.biometricEnable) {
        return next({
          message: 'Biometric login is not enabled.',
          statusCode: 400,
        });
      }

      const challengeBuffer = crypto.randomBytes(32);
      const challenge = base64url.encode(challengeBuffer);

      const options = generateRegistrationOptions({
        rpName: '真薪話(True Salary Story)',
        rpID: process.env.EXPECTED_RPID,
        userID: user.id,
        userName: user.email,
        challenge: challenge,
        attestationType: 'direct',
      });

      if (isAndroid) {
        Object.assign(options, {
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
          },
        });
      }

      if (!options) {
        return next({
          message: 'Failed to generate attestation options.',
          statusCode: 500,
        });
      }

      req.session.challenge = options.challenge;
      req.session.user_id = user.id;
      req.session.save((error) => {
        if (error) {
          next({
            message: 'Save session failed.',
          });
        }
        res.status(200).json({
          status: 'success',
          message: 'Attestation options generated successfully',
          data: options,
        });
      });
    } catch (error) {
      next({
        message: 'An error occurred while generating the attestation.',
      });
    }
  },
);

// 2. verify attestation response if passed, save credential to user data
router.post('/verifyAttestation', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const { body } = req;
    const { challenge, user_id } = req.session;
    console.log(1, body);
    console.log(2, challenge);
    console.log(3, user_id);
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        data: {
          userId: user_id,
        },
      });
    }

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: process.env.FRONTEND_URL,
      expectedRPID: process.env.EXPECTED_RPID,
    });
    console.log(4, verification);
    const { verified, registrationInfo } = verification;
    console.log(5, verified);
    console.log(6, registrationInfo);
    if (verified) {
      // save credential to user data
      const credential = {
        id: registrationInfo.credentialID,
        type: 'public-key',
        publicKey: registrationInfo.credentialPublicKey,
        fmt: registrationInfo.fmt,
        counter: registrationInfo.counter,
        aaguid: registrationInfo.aaguid,
      };
      user.credentials.push(credential);
      await user.save();
      res.status(200).json({
        status: 'success',
        message: 'Biometric registered successfully',
      });
    } else {
      res
        .status(400)
        .json({ status: 'error', message: 'Could not verify attestation.' });
    }
  } catch (error) {
    next(error);
  }
});

// every time user biometric login, we will generate a new token
router.post('/refreshToken', async (req, res, next) => {
  const refreshToken = req.cookies['refreshToken'];

  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token provided' });
  }

  try {
    const decoded = jwt.verify(refreshToken, config.refreshTokenSecret);
    const user = await User.findById(decoded.id);

    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000; // in milliseconds

    if (decoded.iat * 1000 < Date.now() - THIRTY_DAYS) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token is expired',
        data: null,
      });
    }

    const token = jwt.sign({ id: user.id }, config.jwtSecret, {
      expiresIn: '1h',
    });

    res.status(200).json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: { token },
    });
  } catch (error) {
    next(error);
  }
});

// 3. generate assertion options for user login biometric
router.post('/generateAssertion', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const user = req.user;

    if (!user.biometricEnable) {
      return res.status(400).json({ error: 'Biometric login is not enabled.' });
    }

    const challengeBuffer = crypto.randomBytes(32);
    const challenge = base64url.encode(challengeBuffer);

    const options = generateAuthenticationOptions({
      timeout: 100000,
      rpID: process.env.EXPECTED_RPID,
      challenge: challenge,
      allowCredentials: user.credentials,
    });
    console.log(1, options);

    req.session.challenge = options.challenge;
    req.session.user_id = user.id;

    res.status(200).json({
      status: 'success',
      message: 'Assertion options generated successfully',
      data: options,
    });
  } catch (error) {
    next(error);
  }
});

// 4. verify assertion response if passed, return jwt token
router.post('/verifyAssertion', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const { body } = req;
    const { challenge, user_id } = req.session;

    const user = await User.findById(user_id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    const expectedCredential = user.credentials.find(
      ({ id }) => id === body.id,
    );
    console.log(2, expectedCredential);

    if (!expectedCredential) {
      return res.status(400).json({
        status: 'error',
        message: 'Expected credential not found',
      });
    }

    const { verified } = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: process.env.FRONTEND_URL,
      expectedRPID: process.env.EXPECTED_RPID,
      authenticator: expectedCredential,
    });
    console.log(3, verified);

    if (verified) {
      // Set the refreshToken in an HTTP-Only cookie.
      res.cookie('refreshToken', user.refreshToken, {
        httpOnly: true,
        secure: true, // set to true in a production environment to ensure the cookie is sent over HTTPS
        sameSite: 'strict', // can be set to 'strict' or 'lax' to help prevent CSRF attacks
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // sets the cookie to expire in 30 days
      });

      return res.redirect(`${process.env.FRONTEND_URL}`);
    } else {
      res.status(400).json({
        status: 'error',
        message: 'Could not verify user.',
      });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
