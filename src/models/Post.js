const mongoose = require('mongoose');

const formatDate = (date) => {
  return new Date(date).toISOString().substring(0, 10);
};

const salaryFieldsValidator = function () {
  const hourlySalarySet = !!this.hourlySalary;
  const dailySalarySet = !!this.dailySalary;
  const monthlySalarySet = !!this.monthlySalary;

  if (!hourlySalarySet && !dailySalarySet && !monthlySalarySet) {
    throw new Error('請至少填寫「月薪」、「時薪」或「日薪」其中一項');
  }
};

const postSchema = new mongoose.Schema(
  {
    taxId: {
      type: String,
      required: [true, '請輸入統一編號'],
    },
    companyName: {
      type: String,
      required: [true, '請輸入您的公司名稱'],
    },
    title: {
      type: String,
      required: [true, '請輸入您的職位'],
    },
    employmentType: {
      type: String,
      enum: ['全職', '兼職', '實習', '約聘', '派遣'],
      default: '全職',
      required: [true, '請輸入您的職務類別'],
    },
    inService: {
      type: Boolean,
      default: true,
      required: true,
    },
    city: {
      type: String,
      required: [true, '請輸入您工作的城市'],
    },
    workYears: {
      type: Number,
      required: [true, '請輸入您的在職年資'],
    },
    totalWorkYears: {
      type: Number,
      required: [true, '請輸入您的總年資'],
    },
    monthlySalary: {
      type: Number,
      default: null,
      validate: salaryFieldsValidator,
    },
    dailySalary: {
      type: Number,
      default: null,
      validate: salaryFieldsValidator,
    },
    avgWorkingDaysPerMonth: {
      type: Number,
      default: null,
      required: () => {
        return !!this.hourlySalary || !!this.dailySalary;
      },
    },
    hourlySalary: {
      type: Number,
      default: null,
      validate: salaryFieldsValidator,
    },
    avgHoursPerDay: {
      type: Number,
      default: null,
      required: () => {
        return !!this.hourlySalary;
      },
    },
    yearEndBonus: {
      type: Number,
      default: null,
    },
    holidayBonus: {
      type: Number,
      default: null,
    },
    profitSharingBonus: {
      type: Number,
      default: null,
    },
    otherBonus: {
      type: Number,
      default: null,
    },
    yearlySalary: {
      type: Number,
      required: [true, '請輸入您的年薪'],
    },
    overtime: {
      type: Number,
      enum: [1, 2, 3, 4, 5],
      required: [true, '請輸入您的加班頻率'],
      default: 2,
    },
    feeling: {
      type: Number,
      enum: [1, 2, 3, 4, 5],
      required: [true, '請輸入您的上班心情'],
      default: 2,
    },
    jobDescription: {
      type: String,
      required: [true, '請輸入您的工作內容'],
    },
    suggestion: {
      type: String,
      default: '',
      required: [true, '請輸入您的建議'],
    },
    tags: {
      type: [String],
      default: [],
    },
    customTags: {
      type: [String],
      default: [],
    },
    unlockedUsers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        createdAt: {
          type: Date,
          required: true,
          default: Date.now,
        },
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'removed'],
      default: 'pending',
    },
    rejectReason: {
      type: String,
      default: '',
      required: function () {
        return this.status === 'rejected';
      },
    },
    seen: { type: Number, default: 0 },
    createUser: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    createDate: { type: Date, default: Date.now },
    updateUser: {
      type: mongoose.Schema.ObjectId,
      ref: 'Admin',
    },
    updateDate: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

postSchema.path('overtime').get(function (num) {
  const overtimeMap = {
    1: '準時上下班',
    2: '很少加班',
    3: '偶爾加班',
    4: '常常加班',
    5: '賣肝拼經濟',
  };
  return overtimeMap[num];
});

postSchema.path('feeling').get(function (num) {
  const feelingMap = {
    1: '非常開心',
    2: '還算愉快',
    3: '平常心',
    4: '有苦說不出',
    5: '想換工作了',
  };
  return feelingMap[num];
});

postSchema.path('createDate').get(function (date) {
  return formatDate(date);
});

postSchema.path('updateDate').get(function (date) {
  return formatDate(date);
});

postSchema.set('toJSON', {
  getters: true,
  transform: (doc, ret) => {
    ret.postId = ret._id;
    delete ret._id;
    delete ret.id;
    delete ret.unlockedUsers;
  },
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
