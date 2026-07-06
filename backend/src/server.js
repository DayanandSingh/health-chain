require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");

const port = process.env.PORT || 5001;

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is required. Set it in backend/.env");
  process.exit(1);
}

connectDB()
  .then(() => {
    app.listen(port, () => console.log(`API running on http://localhost:${port}`));
  })
  .catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });

