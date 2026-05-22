# SmartStore AI

SmartStore AI is a full-stack web app for managing an online store. It has a premium SaaS dashboard, product management, analytics, account settings, store settings, and AI tools for product content and sales insights.

The app is split into two parts:

- `frontend`: React + Vite dashboard
- `backend`: Node.js + Express API with MongoDB

## Main Features

- User login and account creation
- Protected dashboard pages
- Modern sidebar navigation
- Sticky topbar with store name, search, notifications, dark mode, and profile menu
- Product list, product details, add/edit/delete product flow
- AI-generated product descriptions
- AI-generated SEO tags and keywords
- AI-generated marketing captions
- AI sales insights
- Revenue analytics and charts
- Top products view
- Low stock alerts
- Account profile page
- Store settings page
- Dark mode support
- Responsive layout for desktop and mobile

## AI Sales Insights

The AI insights area helps analyze:

- Product performance
- Revenue trends
- Sales growth
- Low-performing products
- Pricing recommendations
- Inventory suggestions
- Trending product predictions
- Sales improvement advice

Example insight:

> Wireless earbuds sales increased 24% this month. Consider increasing inventory and running a premium bundle offer.

## Tech Stack

### Frontend

- React
- Vite
- React Router
- Axios
- Chart.js
- Lucide React icons
- React Hot Toast
- Tailwind CSS plugin

### Backend

- Node.js
- Express
- MongoDB
- Mongoose
- JWT authentication
- bcrypt password hashing
- Google Gemini API for AI features

## Project Structure

```text
smartstore_ai/
  backend/
    src/
      config/
      controllers/
      middleware/
      models/
      routes/
      utils/
      server.js
    package.json

  frontend/
    src/
      components/
      context/
      pages/
      services/
      App.jsx
      index.css
      main.jsx
    package.json
    vite.config.js

  README.md
```

## Requirements

Install these before running the project:

- Node.js
- npm
- MongoDB connection string
- Gemini API key, optional but needed for real AI responses

## Environment Variables

Create a `.env` file inside the `backend` folder.

Example:

```env
PORT=5001
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=your_gemini_api_key
```

Notes:

- The frontend Vite server runs on `http://localhost:5173`.
- The backend API should run on `http://localhost:5001`.
- The frontend proxy sends `/api` requests to `http://localhost:5001`.
- If `GEMINI_API_KEY` is missing or quota is unavailable, some AI features may use fallback responses.

## Installation

From the project root:

```bash
cd backend
npm install
```

```bash
cd ../frontend
npm install
```

## Run the App

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend in another terminal:

```bash
cd frontend
npm run dev
```

Open the app:

```text
http://localhost:5173
```

Backend health check:

```text
http://localhost:5001/health
```

## Seed Demo Data

The backend has a seed script.

```bash
cd backend
npm run seed
```

The seed script creates demo data if it is configured correctly with your MongoDB connection.

## Useful Commands

Frontend:

```bash
cd frontend
npm run dev
npm run build
npm run lint
npm run preview
```

Backend:

```bash
cd backend
npm run dev
npm start
npm run seed
```

## Main Frontend Routes

```text
/              Dashboard
/products      Products
/add-product   Add Product
/analytics     Analytics
/ai-insights   AI Sales Insights
/orders        Orders
/customers     Customers
/profile       Account Profile
/settings      Store Settings
/login         Login and Register
```

## Main API Routes

Authentication:

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
PUT  /api/auth/me
```

Products:

```text
GET    /api/products
POST   /api/products
GET    /api/products/:id
PUT    /api/products/:id
DELETE /api/products/:id
GET    /api/products/categories
```

Analytics:

```text
GET /api/analytics/summary
GET /api/analytics/revenue
GET /api/analytics/top-products
GET /api/analytics/by-category
GET /api/analytics/by-channel
GET /api/analytics/low-stock
```

Sales:

```text
GET /api/sales/orders
GET /api/sales/customers
```

AI:

```text
POST /api/ai/generate-description
POST /api/ai/generate-tags
POST /api/ai/generate-caption
POST /api/ai/sales-insights
PUT  /api/ai/save/:productId
```

## Account Profile

The account profile page includes:

- Name
- Email
- Avatar URL
- Phone number field
- Role display
- Security status
- Notification preferences

Saving the profile updates the logged-in user through:

```text
PUT /api/auth/me
```

## Store Settings

The store settings page includes:

- Store name
- Legal business name
- Support email
- Store URL
- Business address
- Currency
- Tax ID
- Gross margin target
- Shipping threshold
- Inventory policy
- AI automation preferences

Saving the store name updates the logged-in user and refreshes the topbar/sidebar store name.

## Authentication Flow

1. User logs in or registers.
2. Backend returns a JWT token.
3. Frontend stores the token in `localStorage`.
4. Axios sends the token with API requests.
5. Protected routes only load when the user is authenticated.

## Build for Production

Build the frontend:

```bash
cd frontend
npm run build
```

Start the backend:

```bash
cd backend
npm start
```

The production frontend files are created in:

```text
frontend/dist
```

## Troubleshooting

### Frontend cannot reach backend

Check that backend is running on port `5001`.

```text
http://localhost:5001/health
```

Also check `frontend/vite.config.js`. It proxies `/api` to `http://localhost:5001`.

### MongoDB connection fails

Check:

- `MONGODB_URI` is correct
- Your database user has access
- Your IP address is allowed in MongoDB Atlas

### Login keeps redirecting

Try clearing local storage:

```text
smartstore_token
smartstore_user
```

Then log in again.

### AI requests fail

Check:

- `GEMINI_API_KEY` is set
- Your Gemini quota is available
- Backend is running after changing `.env`

## Notes for Development

- Keep backend and frontend running in separate terminals.
- Use `npm run lint` before finishing frontend changes.
- Use `npm run build` to catch production build issues.
- The app currently uses MongoDB for core data.
- Some settings fields are UI preferences unless connected to a backend model later.

## License

This project is for learning and store dashboard development. Add a license file if you plan to publish or distribute it.
