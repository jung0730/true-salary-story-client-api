const config = require('config');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const User = require('models/User');
const Point = require('models/Point');

passport.use(
  new GoogleStrategy(
    config.passport.google,
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // atomic updates
        // 找不到user 執行$setOnInsert, 找得到執行$set
        console.log(profile, 'profile');
        console.log(profile.photos[0], 'photo');
        const user = await User.findOneAndUpdate(
          { googleId: profile.id },
          {
            $setOnInsert: {
              googleId: profile.id,
              displayName: profile.displayName,
              email: profile.emails[0].value,
              profilePicture: profile.photos[0].value,
            },
            $set: { loginTimestamp: new Date() },
          },
          // new: true returns the document after update was applied
          // upsert: true makes it a find-and-upsert operation
          { upsert: true, new: true },
        );

        const point = await Point.findOneAndUpdate(
          { user: user._id },
          { $setOnInsert: { user: user._id } },
          { upsert: true, new: true },
        );
        user.points = point._id;
        await user.save();

        // user.id is a string representation of the ObjectId
        const token = jwt.sign({ id: user.id }, config.jwtSecret, {
          expiresIn: '1h',
        });
        const refreshToken = jwt.sign(
          { id: user.id },
          config.refreshTokenSecret,
          {
            expiresIn: '30d',
          },
        );
        user.token = token;
        user.refreshToken = refreshToken;

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    },
  ),
);

module.exports = passport;
