# True Salary Story(Client API)

## Project Structure

```markdown
true-salary-story-client-api/
├── src/
│ ├── app.js
│ ├── config/
│ │ ├── index.js
│ │ ├── database.js
│ │ ├── passport.js
│ ├── middleware/
│ │ ├── jwtAuthMiddleware.js
│ │ ├── errorHandler.js
│ ├── models/
│ │ ├── Point.js
│ │ ├── User.js
│ ├── routes/
│ │ ├── index.js
│ │ ├── auth.js
│ │ ├── social.js
│ │ ├── user.js
├── .env
├── .gitignore
```

## How to generate JWT_SECRET

```bash
openssl rand -base64 32
```
