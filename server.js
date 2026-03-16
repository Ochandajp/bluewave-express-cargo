const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// ============= IMPROVED CORS CONFIGURATION =============
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
    credentials: true,
    optionsSuccessStatus: 200
}));

// Handle preflight requests
app.options('*', cors());

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// ============= MongoDB Connection =============
const MONGODB_URI = 'mongodb+srv://johnpaul:jp54321@cluster0.ugm91.mongodb.net/shipping_db?retryWrites=true&w=majority';

console.log('🔄 Connecting to MongoDB...');

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('✅ MongoDB connected successfully');
})
.catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
});

// ============= SCHEMAS =============
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true },
    phone: String,
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: true },
    accountType: { type: String, enum: ['user', 'admin'], default: 'admin' },
    createdAt: { type: Date, default: Date.now },
    lastLogin: Date,
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
});

const shipmentSchema = new mongoose.Schema({
    trackingNumber: { type: String, unique: true, required: true },
    senderName: { type: String, default: '' },
    senderEmail: { type: String, default: '' },
    senderPhone: { type: String, default: '' },
    senderAddress: { type: String, default: '' },
    recipientName: { type: String, default: '' },
    recipientEmail: { type: String, default: '' },
    recipientPhone: { type: String, default: '' },
    deliveryAddress: { type: String, default: '' },
    origin: { type: String, default: '' },
    destination: { type: String, default: '' },
    carrier: { type: String, default: '' },
    carrierRef: { type: String, default: '' },
    shipmentType: { type: String, default: 'ROAD' },
    product: { type: String, default: '' },
    quantity: { type: String, default: '' },
    pieceType: { type: String, default: '' },
    packageType: { type: String, default: '' },
    packageStatus: { type: String, default: '' },
    description: { type: String, default: '' },
    length: { type: String, default: '' },
    width: { type: String, default: '' },
    height: { type: String, default: '' },
    weight: { type: String, default: '' },
    paymentMode: { type: String, default: 'cash' },
    freightCost: { type: Number, default: 0 },
    expectedDelivery: { type: String, default: '' },
    departureDate: { type: String, default: '' },
    pickupDate: { type: String, default: '' },
    departureTime: { type: String, default: '' },
    status: { 
        type: String, 
        enum: ['pending', 'on hold', 'out for delivery', 'delivered'],
        default: 'pending'
    },
    remark: { type: String, default: '' },
    comment: { type: String, default: '' },
    trackingHistory: [{
        status: String,
        location: String,
        message: String,
        remark: String,
        timestamp: { type: Date, default: Date.now }
    }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Shipment = mongoose.model('Shipment', shipmentSchema);

const JWT_SECRET = 'your_jwt_secret_key_change_this_in_production';

// ============= MIDDLEWARE =============
const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

const isAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (user && (user.isAdmin || user.accountType === 'admin')) {
            next();
        } else {
            res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error checking admin status' });
    }
};

// ============= ROUTES =============
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/api/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'API is working!',
        time: new Date().toISOString()
    });
});

// ============= PUBLIC TRACKING =============
app.get('/api/shipments/track/:trackingNumber', async (req, res) => {
    try {
        const { trackingNumber } = req.params;
        const shipment = await Shipment.findOne({ trackingNumber });

        if (!shipment) {
            return res.status(404).json({ 
                success: false,
                message: 'Shipment not found' 
            });
        }

        res.json({ success: true, shipment });
    } catch (error) {
        console.error('Tracking error:', error);
        res.status(500).json({ success: false, message: 'Error tracking shipment' });
    }
});

// ============= LOGIN =============
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ 
            $or: [{ username: username }, { email: username }] 
        });
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user._id, username: user.username, isAdmin: user.isAdmin }, 
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ 
            success: true,
            message: 'Login successful', 
            token,
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                isAdmin: true,
                role: 'admin'
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============= SETUP ADMIN =============
app.get('/api/setup-admin', async (req, res) => {
    try {
        const adminExists = await User.findOne({ isAdmin: true });
        
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const admin = new User({
                name: 'System Administrator',
                username: 'admin',
                email: 'admin@bluewave.com',
                phone: '+1234567890',
                password: hashedPassword,
                isAdmin: true,
                accountType: 'admin',
                status: 'active'
            });
            
            await admin.save();
            
            res.json({ 
                success: true,
                message: '✅ Admin created successfully!', 
                credentials: { username: 'admin', password: 'admin123' }
            });
        } else {
            res.json({ success: true, message: '✅ Admin already exists' });
        }
    } catch (error) {
        console.error('❌ Setup admin error:', error);
        res.status(500).json({ success: false, message: 'Error setting up admin' });
    }
});

// ============= CREATE SHIPMENT =============
app.post('/api/shipments', authenticate, isAdmin, async (req, res) => {
    try {
        console.log('📦 Creating shipment...');
        
        const data = req.body;
        
        // Generate tracking number
        let trackingNumber = data.trackingNumber;
        if (!trackingNumber) {
            let exists;
            do {
                trackingNumber = Math.floor(100000000 + Math.random() * 900000000).toString();
                exists = await Shipment.findOne({ trackingNumber });
            } while (exists);
        }

        const shipmentData = {
            trackingNumber: trackingNumber,
            senderName: data.senderName || '',
            senderEmail: data.senderEmail || '',
            senderPhone: data.senderPhone || '',
            senderAddress: data.senderAddress || '',
            recipientName: data.recipientName || '',
            recipientEmail: data.recipientEmail || '',
            recipientPhone: data.recipientPhone || '',
            deliveryAddress: data.deliveryAddress || '',
            origin: data.origin || '',
            destination: data.destination || '',
            carrier: data.carrier || '',
            shipmentType: data.shipmentType || 'ROAD',
            product: data.product || '',
            quantity: data.quantity ? data.quantity.toString() : '',
            pieceType: data.pieceType || '',
            packageType: data.packageType || '',
            packageStatus: data.packageStatus || '',
            description: data.description || '',
            length: data.length ? data.length.toString() : '',
            width: data.width ? data.width.toString() : '',
            height: data.height ? data.height.toString() : '',
            weight: data.weight ? data.weight.toString() : '',
            paymentMode: data.paymentMode || 'cash',
            freightCost: data.freightCost || 0,
            expectedDelivery: data.expectedDelivery || '',
            departureDate: data.departureDate || '',
            pickupDate: data.pickupDate || '',
            status: data.status || 'pending',
            remark: data.comment || '',
            comment: data.comment || '',
            trackingHistory: [{
                status: data.status || 'pending',
                location: data.origin || 'Origin',
                message: 'Shipment created',
                remark: data.comment || 'Initial shipment registration',
                timestamp: new Date()
            }],
            createdBy: req.user.id
        };

        const shipment = new Shipment(shipmentData);
        await shipment.save();
        
        console.log('✅ Shipment created:', shipment.trackingNumber);

        res.status(201).json({ 
            success: true,
            message: 'Shipment created successfully', 
            trackingNumber: shipment.trackingNumber
        });

    } catch (error) {
        console.error('❌ Error creating shipment:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error creating shipment: ' + error.message 
        });
    }
});

// ============= GET ALL SHIPMENTS =============
app.get('/api/admin/shipments', authenticate, isAdmin, async (req, res) => {
    try {
        const shipments = await Shipment.find().sort({ createdAt: -1 });
        res.json({ success: true, shipments });
    } catch (error) {
        console.error('Error fetching shipments:', error);
        res.status(500).json({ success: false, message: 'Error fetching shipments' });
    }
});

// ============= GET SINGLE SHIPMENT =============
app.get('/api/admin/shipments/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const shipment = await Shipment.findById(req.params.id);
        if (!shipment) {
            return res.status(404).json({ success: false, message: 'Shipment not found' });
        }
        res.json({ success: true, shipment });
    } catch (error) {
        console.error('Error fetching shipment:', error);
        res.status(500).json({ success: false, message: 'Error fetching shipment' });
    }
});

// ============= UPDATE STATUS =============
app.put('/api/admin/shipments/:id/status', authenticate, isAdmin, async (req, res) => {
    try {
        const { status, location, message, remark } = req.body;
        
        if (!remark || remark.trim() === '') {
            return res.status(400).json({ success: false, message: 'Remarks are required' });
        }

        const shipment = await Shipment.findById(req.params.id);
        if (!shipment) {
            return res.status(404).json({ success: false, message: 'Shipment not found' });
        }

        shipment.status = status || shipment.status;
        shipment.trackingHistory.push({
            status: shipment.status,
            location: location || shipment.origin || 'Unknown',
            message: message || `Status updated to ${shipment.status}`,
            remark: remark,
            timestamp: new Date()
        });
        shipment.remark = remark;
        shipment.updatedAt = new Date();
        
        await shipment.save();

        res.json({ success: true, message: 'Status updated successfully' });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ success: false, message: 'Error updating status' });
    }
});

// ============= UPDATE FREIGHT COST =============
app.put('/api/admin/shipments/:id/freight', authenticate, isAdmin, async (req, res) => {
    try {
        const { freightCost } = req.body;
        
        const shipment = await Shipment.findById(req.params.id);
        if (!shipment) {
            return res.status(404).json({ success: false, message: 'Shipment not found' });
        }

        shipment.freightCost = freightCost || 0;
        shipment.updatedAt = new Date();
        await shipment.save();

        res.json({ success: true, message: 'Freight cost updated successfully' });
    } catch (error) {
        console.error('Error updating freight cost:', error);
        res.status(500).json({ success: false, message: 'Error updating freight cost' });
    }
});

// ============= DELETE SHIPMENT =============
app.delete('/api/admin/shipments/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const shipment = await Shipment.findByIdAndDelete(req.params.id);
        if (!shipment) {
            return res.status(404).json({ success: false, message: 'Shipment not found' });
        }
        res.json({ success: true, message: 'Shipment deleted successfully' });
    } catch (error) {
        console.error('Error deleting shipment:', error);
        res.status(500).json({ success: false, message: 'Error deleting shipment' });
    }
});

// ============= GET STATS =============
app.get('/api/admin/stats', authenticate, isAdmin, async (req, res) => {
    try {
        const totalShipments = await Shipment.countDocuments();
        const activeShipments = await Shipment.countDocuments({ 
            status: { $in: ['out for delivery', 'on hold'] }
        });
        const deliveredShipments = await Shipment.countDocuments({ status: 'delivered' });
        const pendingShipments = await Shipment.countDocuments({ status: 'pending' });
        
        const recentShipments = await Shipment.find().sort({ createdAt: -1 }).limit(5);

        res.json({
            success: true,
            totalShipments,
            activeShipments,
            deliveredShipments,
            pendingShipments,
            recentShipments
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, message: 'Error fetching stats' });
    }
});

// ============= MIGRATE EXISTING SHIPMENTS =============
app.post('/api/admin/migrate-shipments', authenticate, isAdmin, async (req, res) => {
    try {
        const shipments = await Shipment.find({});
        let updated = 0;
        
        for (const shipment of shipments) {
            let needsUpdate = false;
            
            if (shipment.packageType === undefined || shipment.packageType === null) {
                shipment.packageType = '';
                needsUpdate = true;
            }
            if (shipment.packageStatus === undefined || shipment.packageStatus === null) {
                shipment.packageStatus = '';
                needsUpdate = true;
            }
            if (shipment.departureDate === undefined || shipment.departureDate === null) {
                shipment.departureDate = '';
                needsUpdate = true;
            }
            if (shipment.pickupDate === undefined || shipment.pickupDate === null) {
                shipment.pickupDate = '';
                needsUpdate = true;
            }
            
            if (needsUpdate) {
                await shipment.save();
                updated++;
            }
        }
        
        res.json({
            success: true,
            message: `Migration complete. Updated ${updated} shipments.`,
            totalShipments: shipments.length,
            updated: updated
        });
    } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({ success: false, message: 'Error migrating shipments' });
    }
});

// ============= DEBUG ROUTE =============
app.get('/api/debug/check-db', authenticate, isAdmin, async (req, res) => {
    try {
        const count = await Shipment.countDocuments();
        res.json({
            success: true,
            databaseConnected: mongoose.connection.readyState === 1,
            totalShipments: count
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= START SERVER =============
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`📱 Public site: http://localhost:${PORT}`);
    console.log(`👤 Admin panel: http://localhost:${PORT}/admin`);
    console.log(`✅ Test API: http://localhost:${PORT}/api/test\n`);
});