const mongoose = require('mongoose');

const ConsultSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  },
  receiver: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  },
  messages: [
    {
      user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
      content: {
        type: String,
        required: true,
      },
      createDate: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  activePost: {
    type: mongoose.Schema.ObjectId,
    ref: 'Post',
  },
  createDate: {
    type: Date,
    default: Date.now,
  },
  updateDate: {
    type: Date,
    default: Date.now,
  },
});

const Consult = mongoose.model('Consult', ConsultSchema);

module.exports = Consult;
