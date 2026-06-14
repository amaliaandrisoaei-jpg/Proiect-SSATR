import dotenv from 'dotenv';
import path from 'path';

// Force load .env.test and override existing variables
dotenv.config({ 
    path: path.resolve(process.cwd(), '.env.test'),
    override: true 
});
