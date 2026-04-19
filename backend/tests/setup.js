import dotenv from 'dotenv';
import path from 'path';

// Force load .env.test
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
