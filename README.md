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
│ ├── models/
│ │ ├── User.js
│ ├── routes/
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
