const mongoose = require('mongoose');

const industryTypeSchema = new mongoose.Schema({
  typeId: {
    type: String,
    required: true,
  },
  typeName: {
    type: String,
    required: true,
  },
});

const SalarySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  companyName: {
    type: String,
    required: true,
  },
  taxId: {
    type: String,
    required: true,
  },
  industryType: {
    type: [industryTypeSchema],
  },
  employmentType: {
    type: String,
    required: true,
  },
  inService: {
    type: Boolean,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  workYears: {
    type: Number,
    required: true,
  },
  totalWorkYears: {
    type: Number,
    required: true,
  },
  avgHoursPerDay: {
    type: Number,
    required: true,
  },
  monthlySalary: {
    type: Number,
    required: true,
  },
  yearlySalary: {
    type: Number,
    required: true,
  },
  yearEndBonus: {
    type: Number,
  },
  holidayBonus: {
    type: Number,
  },
  profitSharingBonus: {
    type: Number,
  },
  otherBonus: {
    type: Number,
  },
  overtime: {
    type: Number,
    required: true,
  },
  feeling: {
    type: Number,
    required: true,
  },
  jobDescription: {
    type: String,
    required: true,
  },
  suggestion: {
    type: String,
  },
  tags: {
    type: [Number],
  },
  customTags: {
    type: [String],
  },
});

const Salary = mongoose.model('Salaries', SalarySchema);

module.exports = Salary;
