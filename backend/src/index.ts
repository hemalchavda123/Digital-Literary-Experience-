import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import annotationRoutes from './routes/annotationRoutes';
import labelRoutes from './routes/labelRoutes';
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import documentRoutes from './routes/documentRoutes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Routes
app.use('/api/annotations', annotationRoutes);
app.use('/api/labels', labelRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/documents', documentRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server (Prisma connects lazily on first query)
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
