const mongoose = require('mongoose');

const SalarySchema = new mongoose.Schema(
  {
    taxId: { type: String, required: true },
    companyName: { type: String, required: true },
    title: { type: String, required: true },
    employmentType: {
      type: String,
      enum: ['全職', '兼職', '實習', '約聘', '派遣'],
      required: true,
    },
    inService: {
      type: Boolean,
      enum: [true, false],
      required: true,
      default: true,
    },
    city: { type: String, required: true },
    workYears: { type: Number, required: true },
    totalWorkYears: { type: Number, required: true },
    monthlySalary: { type: Number, required: true },
    dailySalary: { type: Number, required: true },
    avgWorkingDaysPerMonth: { type: Number, required: true },
    hourlySalary: { type: Number, required: true },
    dailyAverageWorkingHours: { type: Number, required: true },
    yearEndBonus: { type: Number },
    holidayBonus: { type: Number },
    profitSharingBonus: { type: Number },
    otherBonus: { type: Number },
    overtime: { type: Number, enum: [1, 2, 3, 4, 5], required: true },
    feeling: { type: Number, enum: [1, 2, 3, 4, 5], required: true },
    jobDescription: { type: String, required: true },
    suggestion: { type: String, required: true },
    tags: [{ type: Number, enum: [1, 2, 3, 4, 5, 6, 7, 8, 9] }],
    customTags: [{ type: String }],
    unlockedUsers: [{ type: String }],
    status: {
      type: String,
      enum: ['待審核', '已通過', '已拒絕', '已下架'],
      default: '待審核',
    },
    rejectReason: { type: String },
    seen: { type: Number },
    createUser: { type: String },
    createDate: { type: Date, default: Date.now },
    updateUser: { type: String },
    updateDate: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
  },
);
const Salary = mongoose.model('Salaries', SalarySchema);

module.exports = Salary;
