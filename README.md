E-COMMERCE CATALOG – POLYGLOT PERSISTENCE
=========================================

A full-stack e-commerce application using MySQL for structured data (products, users, orders, cart) and MongoDB for flexible attributes & reviews.

WHAT'S INSIDE
-------------
- Customer storefront – browse products, search, filter, add reviews, shopping cart, checkout (requires address)
- Admin dashboard – manage products (CRUD with image upload), manage custom attributes, reviews, view orders
- JWT authentication – users can register, login, have persistent carts
- Transactional orders – stock updates and order creation in a single MySQL transaction

PREREQUISITES
-------------
- Node.js (v14 or newer)
- MySQL Server (running)
- MongoDB Server (running, e.g., with `mongod`)

SETUP FROM GIT CLONE (recommended)
----------------------------------
If you received this as a Git repository, follow these steps:

1. Clone the repository
   git clone https://github.com/lastirom/verbose-guide.git
   cd verbose-guide

2. Install backend dependencies
   cd backend
   npm install

3. Prepare environment variables
   Copy `.env.example` to `.env` and edit with your credentials:
   cp .env.example .env
   Then open `.env` and set your MySQL password, MongoDB URI, etc.

4. Create MySQL database using the provided dump file
   mysql -u root -p < database.sql
   (Enter your MySQL password when prompted.)

5. Start MongoDB
   Open a separate terminal and run:
   mongod

6. Start the backend server
   npm start
   You should see: "Server running on http://localhost:5000"

7. Open the frontend
   - Admin dashboard: open `frontend/admin-dashboard.html` in your browser
   - Customer store: open `frontend/store.html` in your browser

SETUP FROM ZIP FILE
-------------------
If you received a ZIP archive instead:

1. Extract the ZIP file to a folder of your choice.

2. Open a terminal inside the extracted folder, then go to the `backend` directory:
   cd backend

3. Install dependencies:
   npm install

4. Create a `.env` file (use the `.env.example` as a template):
   PORT=5000
   MYSQL_HOST=localhost
   MYSQL_USER=root
   MYSQL_PASSWORD=your_mysql_password
   MYSQL_DATABASE=ecommerce
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DB=ecommerce_catalog
   JWT_SECRET=your_super_secret_key_change_this

5. Import the MySQL dump:
   mysql -u root -p < database.sql

6. Start MongoDB: `mongod` (in a separate terminal)

7. Start the backend: `npm start`

8. Open the HTML files as described above.

ENVIRONMENT VARIABLES

| Variable          | Description                                    |
|-------------------|------------------------------------------------|
| PORT              | Server port (default 5000)                    |
| MYSQL_HOST        | MySQL host (usually localhost)                |
| MYSQL_USER        | MySQL username                                |
| MYSQL_PASSWORD    | MySQL password                                |
| MYSQL_DATABASE    | Database name (ecommerce)                     |
| MONGODB_URI       | MongoDB connection string                     |
| MONGODB_DB        | MongoDB database name (ecommerce_catalog)     |
| JWT_SECRET        | Secret for signing JWTs (change it!)          |

TROUBLESHOOTING
---------------
- `Cannot find module 'bcrypt'` → run `npm install` inside the `backend` folder.
- MySQL connection error → check that MySQL is running and the `.env` credentials are correct.
- MongoDB connection error → run `mongod` in a separate terminal.
- Order fails with "address required" → logged‑in users must add a shipping address in their profile.
- Images not showing → ensure the `backend/uploads` folder exists and has images.

NOTES
-----
- The backend serves static frontend files from `../frontend`.
- Product attributes and reviews are stored in MongoDB collections (`attributes`, `reviews`).
- All core data (products, users, orders, cart) are stored in MySQL.
- This project is intended for educational use.

LICENSE
-------
Created for educational purposes (DCIT 55 final project).
