import { Hono } from 'hono';
import connectionRoutes from './connection.routes.js';
import frameRoutes from './frame.routes.js';
import adminRoutes from './admin.routes.js';

const router = new Hono();

// Mount each route module
router.route('/', frameRoutes);
router.route('/', connectionRoutes); 
router.route('/admin', adminRoutes);

export default router; 