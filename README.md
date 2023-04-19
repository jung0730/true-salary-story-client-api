# True Salary Story(Client API)

## Project Structure

```markdown
true-salary-story-client-api/
├── src/
│ ├── app.js
│ ├── config/
│ │ ├── database.js
│ │ ├── passport.js
│ ├── models/
│ │ ├── User.js
│ ├── routes/
│ │ ├── auth.js
├── .env
├── .gitignore
```

## How to generate JWT_SECRET

```bash
openssl rand -base64 32
```
