const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { createLinePayBody, createSignature } = require('config/pay/linePay');
const User = require('models/User');
const Point = require('models/Point');
const Transaction = require('models/Transaction');
const PointHistory = require('models/PointHistory');
const jwtAuthMiddleware = require('middleware/jwtAuthMiddleware');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { LINEPAY_VERSION, LINEPAY_SITE, FRONTEND_URL } = process.env;
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const successHandler = require('middleware/successHandler');

dayjs.extend(utc);
dayjs.extend(timezone);

// check transaction time is expired or not
const updateExpiredTransactions = async (userId) => {
  const now = new Date();

  await Transaction.updateMany(
    {
      user: userId,
      status: 'pending',
      expiryTime: { $lt: now },
    },
    {
      $set: { status: 'expired' },
    },
  );
};

function prepareOrder(purchaseType, amount) {
  const orderTimeString = dayjs().utc().format('YYYY-MM-DDTHH:mm:ss.SSS');
  const orderId = `${orderTimeString}_${uuidv4()}`;

  let point = 0;
  let productName = '';
  let productQuantity = 0;
  let productPrice = 0;

  if (purchaseType === 'subscription') {
    productName = '加薪計畫';
    productQuantity = 1;
    productPrice = amount;
    point = 2000;
  } else {
    productName = `購買 ${point} 積分`;
    productQuantity = amount / 150;
    productPrice = 150;
    point = productQuantity * 100;
  }

  const order = {
    amount,
    currency: 'TWD',
    orderId,
    packages: [
      {
        id: uuidv4(),
        amount,
        products: [
          {
            name: productName,
            quantity: productQuantity,
            price: productPrice,
          },
        ],
      },
    ],
  };

  return { ...order, points: point };
}

// Step 1: Create an order
router.post('/order', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const { purchaseType, amount } = req.body;

    if (!purchaseType || !amount) {
      return next({
        statusCode: 400,
        message: 'Both purchaseType and amount are required parameters',
      });
    }

    const order = prepareOrder(purchaseType, amount);

    // Update expired transactions
    await updateExpiredTransactions(req.user.id);

    // Find user
    const user = await User.findById(req.user.id);
    if (!user) {
      return next({
        statusCode: 404,
        message: 'User not found',
      });
    }

    // Create a transaction record
    const transaction = await Transaction.create({
      user: req.user.id,
      transactionId: order.orderId,
      amount: order.amount,
      points: order.points,
      expiryTime: new Date(Date.now() + 15 * 60 * 1000),
      orderDetails: order,
    });

    successHandler(res, {
      transactionId: order.orderId,
    });
  } catch (error) {
    next(error);
  }
});

// Step 2: Send the order to LINE Pay
router.post('/:transactionId', async (req, res, next) => {
  const { transactionId } = req.params;

  // Find the transaction by transactionId
  const transaction = await Transaction.findOne({
    transactionId: transactionId,
  });

  if (!transaction) {
    return res.status(404).json({
      status: 'failed',
      message: 'Transaction not found',
    });
  }

  try {
    // Check if transaction has expired
    if (Date.now() > transaction.expiryTime) {
      transaction.status = 'expired';
      transaction.transactionRemark =
        'Transaction not completed within 15 minutes';
      await transaction.save();

      return res.status(400).json({
        status: 'failed',
        message: 'Transaction has expired',
      });
    }

    // build LINE Pay 請求規定的資料格式
    const linePayBody = createLinePayBody(transaction.orderDetails);

    // CreateSignature 建立加密內容
    const uri = '/payments/request';
    const headers = createSignature(uri, linePayBody);

    // API Site
    const url = `${LINEPAY_SITE}/${LINEPAY_VERSION}${uri}`;
    const linePayRes = await axios.post(url, linePayBody, { headers });

    // Request success
    if (linePayRes?.data?.returnCode === '0000') {
      transaction.linePayTransactionId =
        linePayRes.data.info.paymentUrl.transactionId;
      res.status(200).json({
        status: 'success',
        message: 'Send order to Line Pay successfully',
        data: {
          paymentUrl: linePayRes.data.info.paymentUrl.web,
        },
      });
    } else {
      transaction.status = 'failed';
      transaction.transactionRemark = 'Line Pay request failed';
      res.status(400).send({
        message: 'Order is not found',
      });
    }
    await transaction.save();
  } catch (error) {
    transaction.status = 'failed';
    transaction.transactionRemark = 'Error while processing the transaction';
    await transaction.save();
    next(error);
  }
});

const updateTransaction = async (transaction, status, remark) => {
  transaction.status = status;
  transaction.transactionRemark = remark;
  await transaction.save();
};

const updatePointHistory = async (transaction, status, session = null) => {
  transaction.status = status;

  let pointHistoryRemark;
  if (transaction.amount === 699) {
    pointHistoryRemark = '購買加薪計畫 699';
  } else {
    pointHistoryRemark = `購買 ${transaction.points} 積分`;
  }

  if (status === 'success') {
    const pointHistory = new PointHistory({
      user: transaction.user,
      point: transaction.points,
      remark: pointHistoryRemark,
    });
    await pointHistory.save();
  }
};

// Step 3: Confirm the payment
router.get('/confirm', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  const { transactionId, orderId } = req.query;
  const transaction = await Transaction.findOne({
    transactionId: orderId,
  });

  try {
    // 建立 LINE Pay 請求規定的資料格式
    const uri = `/payments/${transactionId}/confirm`;
    const linePayBody = {
      amount: transaction.amount,
      currency: 'TWD',
    };

    // CreateSignature 建立加密內容
    const headers = createSignature(uri, linePayBody);

    // API 位址
    const url = `${LINEPAY_SITE}/${LINEPAY_VERSION}${uri}`;
    const linePayRes = await axios.post(url, linePayBody, { headers });

    // If linePay request is successful
    if (linePayRes?.data?.returnCode === '0000') {
      // Update transaction status to success
      transaction.status = 'success';
      transaction.transactionRemark = linePayRes.data.returnMessage;
      await transaction.save();

      // Find user
      const user = await User.findById(transaction.user).session(session);

      // Find user's point
      const point = await Point.findById(user.points).session(session);

      // Update user's points
      point.point += transaction.points;
      await point.save({ session });

      // Create a PointHistory record
      updatePointHistory(transaction, 'success', session);

      // Commit the transaction and end the session
      await session.commitTransaction();
      // Redirect the user
      res.redirect(`${FRONTEND_URL}/user/orders`);
    } else {
      await updateTransaction(
        transaction,
        'failed',
        linePayRes.data.returnMessage,
      );
      await updatePointHistory(transaction, 'failed');
      await session.abortTransaction();
      return res.status(400).send({ message: linePayRes });
    }
  } catch (error) {
    await updateTransaction(transaction, 'failed', error);
    res.end();
  } finally {
    session.endSession();
  }
});

module.exports = router;
