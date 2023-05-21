const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  // orderId: {
  //   type: String,
  //   required: true,
  // },
  userId: {
    type: String,
    required: true,
  },
  orderName: {
    type: String,
    required: true,
  },
  orderType: {
    type: String,
    enum: ['typeA', 'typeB'],
    required: true,
  },
  paymentMethod: {
    type: String,
    required: true,
  },
  price: {
    type: String,
    required: true,
  },
  point: {
    type: String,
    required: false,
  },
  createUser: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  },
  createDate: {
    type: Date,
    default: Date.now,
  },
  updateUser: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  },
  updateDate: {
    type: Date,
    default: Date.now,
  },
});

const Order = mongoose.model('Order', OrderSchema);

module.exports = Order;
