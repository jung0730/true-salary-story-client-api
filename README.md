# True Salary Story(Client API)

## Introduction

Originally developed as a collaborative effort with team members during a Node.js course in 2023, this project was built using Express.js and MongoDB. Subsequently, I revamped the front-end project from Nuxt.js 3 to Next.js 13, while also implementing some modifications and optimizations to enhance the back-end codebase.

```markdown
yarn install
yarn dev

# listening at localhost:3000
```

## Structure

```markdown
true-salary-story-client-api/
├── src/
│ ├── config/
│ │ ├── pay
│ │ │ ├── linePay.js
│ │ ├── database.js
│ │ ├── index.js
│ │ ├── mailer.js
│ │ ├── passport.js
│ ├── constants/
│ │ ├── index.js
│ ├── middleware/
│ │ ├── errorHandler.js
│ │ ├── jwtAuthMiddleware.js
│ │ ├── partialPostInfosMiddleware.js
│ │ ├── sucessHandler.js
│ ├── models/
│ │ ├── Company.js
│ │ ├── Consult.js
│ │ ├── Keyword.js
│ │ ├── Point.js
│ │ ├── PointHistory.js
│ │ ├── Post.js
│ │ ├── Salary.js
│ │ ├── Transaction.js
│ │ ├── User.js
│ ├── routes/
│ │ ├── pay
│ │ │ ├── linePay.js
│ │ ├── account.js
│ │ ├── auth.js
│ │ ├── company.js
│ │ ├── index.js
│ │ ├── order.js
│ │ ├── public.js
│ │ ├── salary.js
│ │ ├── social.js
│ │ ├── user.js
│ ├── websocket/
│ │ ├── index.js
│ ├── app.js
├── .env
```

## Features

- Google login for user authentication
- User profile
- Display of salary information
- Submission feature enabling users to post salary-related content
- Order placement with Linepay payment

### How to generate JWT_SECRET

```bash
openssl rand -base64 32
```

### How to generate SESSION_SECRET

```bash
openssl rand -hex 32
```
