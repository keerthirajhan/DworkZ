const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

// Load env vars
dotenv.config();

// Connect to database
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dworkz');
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Auto-migrate existing inventory items without itemId
    const Inventory = require('./models/Inventory');
    const unindexedItems = await Inventory.find({ itemId: { $exists: false } }).sort('createdAt');
    if (unindexedItems.length > 0) {
      console.log(`Migrating ${unindexedItems.length} inventory items to have sequential itemIds...`);
      for (let i = 0; i < unindexedItems.length; i++) {
        const item = unindexedItems[i];
        const existingCount = await Inventory.countDocuments({ itemId: { $exists: true } });
        item.itemId = `INV-${String(existingCount + 1).padStart(4, '0')}`;
        await item.save();
      }
      console.log('Migration complete!');
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
};

connectDB();

// Route files
const auth = require('./routes/authRoutes');
const visitors = require('./routes/visitorRoutes');
const clients = require('./routes/clientRoutes');
const bookings = require('./routes/bookingRoutes');
const inventory = require('./routes/inventoryRoutes');
const proposals = require('./routes/proposalRoutes');
const utilization = require('./routes/utilizationRoutes');
const invoices = require('./routes/invoiceRoutes');
const activities = require('./routes/activityRoutes');
const alerts = require('./routes/alertRoutes');
const email = require('./routes/emailRoutes');
const reports = require('./routes/reportsRoutes');
const clientPortal = require('./routes/clientPortalRoutes');

const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);

const rawFrontendUrl = process.env.FRONTEND_URL || '';
const rawAllowedOrigins = process.env.ALLOWED_ORIGINS || '';

// Base list of explicitly allowed origins
const defaultOrigins = [
  'https://app.thedworkz.com',
  'https://thedworkz.com',
  'https://www.thedworkz.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:8888',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8888',
];

// Combine origins from FRONTEND_URL, ALLOWED_ORIGINS, and defaults
const envOrigins = [rawFrontendUrl, ...rawAllowedOrigins.split(',')]
  .map(url => url.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]))
  .map(origin => origin.replace(/\/+$/, ''));

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    const cleanOrigin = origin.replace(/\/+$/, '');

    // Allow if explicitly listed OR if it's any domain/subdomain under thedworkz.com
    const isAllowed =
      allowedOrigins.includes(cleanOrigin) ||
      /^https?:\/\/([a-zA-Z0-9-]+\.)*thedworkz\.com$/i.test(cleanOrigin);

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true
};

// Init Socket.io
const io = new Server(server, { cors: corsOptions });
// Make io accessible via global (or req.app.set)
global.io = io;

// Enable CORS early in middleware stack
app.use(cors(corsOptions));

// Body parser with increased limit for high-res images/PDFs
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Set security HTTP headers (relaxed for cross-origin in dev)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
}));

// Rate limiting for auth routes (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth requests per 15 mins
  message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

// Mount routers
app.use('/api/v1/auth', auth);
app.use('/api/v1/visitors', visitors);
app.use('/api/v1/clients', clients);
app.use('/api/v1/bookings', bookings);
app.use('/api/v1/inventory', inventory);
app.use('/api/v1/proposals', proposals);
app.use('/api/v1/utilization', utilization);
app.use('/api/v1/invoices', invoices);
app.use('/api/v1/activities', activities);
app.use('/api/v1/alerts', alerts);
app.use('/api/v1/email', email);
app.use('/api/v1/reports', reports);
app.use('/api/v1/client-portal', clientPortal);

// HIGH PRIORITY ARCHIVAL OVERRIDES
const { protect } = require('./middlewares/authMiddleware');
const { getArchivedBookings, deleteBookingsBulkPermanent } = require('./controllers/bookingController');
const { getArchivedInventory, deleteInventoryPermanent } = require('./controllers/inventoryController');

app.get('/api/v1/bookings/archived', protect, getArchivedBookings);
app.post('/api/v1/bookings/bulk-permanent', protect, deleteBookingsBulkPermanent);
app.get('/api/v1/inventory/archived', protect, getArchivedInventory);
app.delete('/api/v1/inventory/:id/permanent', protect, deleteInventoryPermanent);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`));
