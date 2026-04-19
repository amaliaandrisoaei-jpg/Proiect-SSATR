// backend/routes/statistics.js
import express from 'express';

export default function(statisticsService) {
    const router = express.Router();

    router.get('/summary', async (req, res) => {
        try {
            const stats = await statisticsService.getStatistics();
            res.json(stats);
        } catch (err) {
            console.error('Error fetching statistics summary:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    return router;
}
