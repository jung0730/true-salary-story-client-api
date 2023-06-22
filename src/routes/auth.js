const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const config = require('config');
const jwt = require('jsonwebtoken');
const {
  generateAttestationOptions,
  verifyAttestationResponse,
  generateAssertionOptions,
  verifyAssertionResponse,
} = require('@simplewebauthn/server');
const User = require('models/User');
const jwtAuthMiddleware = require('middleware/jwtAuthMiddleware');

router.post('/logout', jwtAuthMiddleware, async (req, res, next) => {
  try {
    // record logout timestamp
    await User.findByIdAndUpdate(req.user.id, {
      logoutTimestamp: new Date(),
      $inc: { tokenVersion: 1 },
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

// every time user biometric login, we will generate a new token
router.post('/refreshToken', async (req, res) => {
  const refreshToken = req.headers['x-refresh-token'];

  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token provided' });
  }

  try {
    const decoded = jwt.verify(refreshToken, config.refreshTokenSecret);
    const user = await User.findById(decoded.id);

    // Check if the refresh token was issued before the logout timestamp
    if (
      user.logoutTimestamp &&
      decoded.iat * 1000 < user.logoutTimestamp.getTime()
    ) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token is expired',
        data: null,
      });
    }

    // Check token version
    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token is expired',
        data: null,
      });
    }

    const newAccessToken = jwt.sign({ id: user.id }, config.jwtSecret, {
      expiresIn: '1h',
    });

    return res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

// enable biometric login
router.patch('/enableBiometric', jwtAuthMiddleware, async (req, res, next) => {
  const user = req.user;

  try {
    user.biometricLogin = !user.biometricLogin;
    await user.save();
    res.status(200).json({
      status: 'success',
      message: 'Biometric enable successfully',
      data: {
        biometricLogin: user.biometricLogin,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Remove user credentials
router.patch('/disableBiometric', jwtAuthMiddleware, async (req, res, next) => {
  const user = req.user;

  try {
    user.biometricLogin = false; // Disable biometric login
    user.credentials = []; // Remove all stored credentials
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Biometric disabled successfully',
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
      const user = await User.findById(req.user.id);

      if (!user) {
        return res
          .status(404)
          .json({ status: 'error', message: 'User not found' });
      }

      // check if user has enabled biometric
      if (!user.biometricLogin) {
        return next({
          message: 'Biometric login is not enabled.',
          statusCode: 400,
        });
      }

      const challenge = crypto.randomBytes(32).toString('hex');

      const options = generateAttestationOptions({
        rpName: '真薪話(True Salary Story)',
        userID: user.id,
        userName: user.email,
        challenge,
        attestationType: 'direct',
        authenticatorSelection: {
          authenticatorAttachment: 'cross-platform',
          userVerification: 'required',
        },
      });

      if (!options) {
        return next({
          message: 'Failed to generate attestation options.',
          statusCode: 500,
        });
      }

      req.session.challenge = challenge;
      req.session.user_id = user.id;

      res.status(200).json({
        status: 'success',
        message: 'Attestation options generated successfully',
        data: options,
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
    const { body } = req.body;
    const { challenge, user_id } = req.session;

    const user = await User.findById(user_id);

    if (!user) {
      return res
        .status(404)
        .json({ status: 'error', message: 'User not found' });
    }

    const { verified, credential } = await verifyAttestationResponse({
      credential: body,
      expectedChallenge: `${challenge}`,
      expectedOrigin: process.env.FRONTEND_URL,
      expectedRPID: process.env.EXPECTED_RPID,
    });

    if (verified) {
      // save credential to user data
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

// 3. generate assertion options for user login biometric
router.post('/generateAssertion', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const user = req.user;

    if (!user.biometricLogin) {
      return res.status(400).json({ error: 'Biometric login is not enabled.' });
    }

    const challenge = crypto.randomBytes(32).toString('hex');

    const options = generateAssertionOptions({
      timeout: 60000,
      rpID: process.env.EXPECTED_RPID,
      challenge,
      allowCredentials: user.credentials,
    });

    req.session.challenge = challenge;
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
    const { body } = req.body;
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

    if (!expectedCredential) {
      return res.status(400).json({
        status: 'error',
        message: 'Expected credential not found',
      });
    }

    const { verified } = await verifyAssertionResponse({
      credential: body,
      expectedChallenge: `${challenge}`,
      expectedOrigin: process.env.FRONTEND_URL,
      expectedRPID: process.env.EXPECTED_RPID,
      authenticator: expectedCredential,
    });

    if (verified) {
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: '1d',
      });
      return res.status(200).json({
        status: 'success',
        message: 'User logged in successfully',
        data: { token },
      });
    }

    res.status(400).json({
      status: 'error',
      message: 'Could not verify user.',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
