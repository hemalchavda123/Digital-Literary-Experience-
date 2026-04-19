import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import annotationRoutes from './routes/annotationRoutes';
import labelRoutes from './routes/labelRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/annotations', annotationRoutes);
app.use('/api/labels', labelRoutes);

// Start server (Prisma connects lazily on first query)
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
