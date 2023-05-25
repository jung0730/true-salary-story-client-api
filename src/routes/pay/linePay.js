const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { createLinePayBody, createSignature } = require('config/pay/linePay');
const User = require('models/User');
const Point = require('models/Point');
const Transaction = require('models/Transaction');
const jwtAuthMiddleware = require('middleware/jwtAuthMiddleware');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { LINEPAY_VERSION, LINEPAY_SITE, FRONTEND_URL } = process.env;
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

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

// Step 1: Create an order
router.post('/order', jwtAuthMiddleware, async (req, res, next) => {
  const { purchaseType, amount } = req.body;

  const orderTimeString = dayjs().utc().format('YYYY-MM-DDTHH:mm:ss.SSS');

  const ORDER_DETAILS = {
    amount: 0,
    currency: 'TWD',
    orderId: `${orderTimeString}_${uuidv4()}`,
    packages: [
      {
        id: uuidv4(),
        amount: 0,
        products: [
          {
            name: '',
            quantity: 0,
            price: 0,
          },
        ],
      },
    ],
  };

  // Update expired transactions
  await updateExpiredTransactions(req.user.id);

  // Check if the required parameters are provided
  if (!purchaseType || !amount) {
    return res.status(400).json({
      status: 'failure',
      message: 'Both purchaseType and amount are required parameters',
    });
  }

  // Assign provided parameters to the ORDER_DETAILS
  ORDER_DETAILS.amount = amount;
  ORDER_DETAILS.packages[0].amount = amount;
  let point = 0;

  // check purchaseType
  if (purchaseType === 'subscription') {
    ORDER_DETAILS.packages[0].products[0].quantity = 1;
    ORDER_DETAILS.packages[0].products[0].price = amount;
    ORDER_DETAILS.packages[0].products[0].name = '訂閱方案';
    point = 2000;
  } else {
    ORDER_DETAILS.packages[0].products[0].quantity = amount / 150;
    ORDER_DETAILS.packages[0].products[0].price = 150;
    point = ORDER_DETAILS.packages[0].products[0].quantity * 100;
    ORDER_DETAILS.packages[0].products[0].name = `購買 ${point} 積分`;
  }

  const orders = JSON.parse(JSON.stringify(ORDER_DETAILS));

  try {
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
      transactionId: orders.orderId,
      amount: orders.amount,
      points: point,
      expiryTime: new Date(Date.now() + 15 * 60 * 1000),
      orderDetails: orders,
    });

    await transaction.save();

    res.status(200).json({
      status: 'success',
      message: 'Order created successfully',
      data: {
        transactionId: orders.orderId,
      },
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
      status: 'failure',
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
        status: 'failure',
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

      // Commit the transaction and end the session
      await session.commitTransaction();
      session.endSession();

      // Redirect the user
      res.redirect(`${FRONTEND_URL}/user/credit-history`);
    } else {
      await updateTransaction(
        transaction,
        'failure',
        linePayRes.data.returnMessage,
      );
      await session.abortTransaction();
      return res.status(400).send({ message: linePayRes });
    }
  } catch (error) {
    await updateTransaction(transaction, 'failed', error);
    await session.endSession();
    res.end();
  }
  session.endSession();
});

module.exports = router;
