import searchService from '../services/search.service.js';

/**
 * GET /api/v1/search
 * Extract search intent using Mistral AI Classifier
 */
export async function search(req, res, next) {
    try {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query (q) is required'
            });
        }

        const result = await searchService.performMultimodalSearch(q);

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
}
