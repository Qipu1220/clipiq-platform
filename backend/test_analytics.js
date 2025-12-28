import 'dotenv/config';
import * as analyticsService from './src/services/analytics.service.js';

async function testAnalytics() {
  console.log('=== Testing Analytics Service ===\n');
  
  try {
    // Test 1: Get trending videos
    console.log('Test 1: Get Trending Videos (top 10, min 1 impression)');
    const trending = await analyticsService.getTrendingVideos(10, 1);
    console.log(`Found ${trending.length} trending videos:\n`);
    
    if (trending.length > 0) {
      trending.forEach((video, idx) => {
        console.log(`${idx + 1}. Video ID: ${video.video_id}`);
        console.log(`   Title: ${video.title}`);
        console.log(`   Impressions (7d): ${video.impression_count_7d}`);
        console.log(`   Watch count (7d): ${video.watch_count_7d}`);
        console.log(`   Watch 10s rate: ${video.watch_10s_rate ? (parseFloat(video.watch_10s_rate) * 100).toFixed(1) + '%' : 'N/A'}`);
        console.log(`   Avg watch duration: ${video.avg_watch_duration_7d ? parseFloat(video.avg_watch_duration_7d).toFixed(1) + 's' : 'N/A'}`);
        console.log(`   Popularity score: ${parseFloat(video.popularity_score).toFixed(2)}`);
        console.log('');
      });
      
      // Test 2: Get detailed stats for top video
      const topVideoId = trending[0].video_id;
      console.log(`\nTest 2: Get Detailed Stats for Video ${topVideoId}`);
      const stats = await analyticsService.getVideoPopularityStats(topVideoId, 5);
      console.log('Stats:', JSON.stringify(stats, null, 2));
      
      // Test 3: Get individual metrics
      console.log(`\nTest 3: Individual Metrics for Video ${topVideoId}`);
      const watch10sRate = await analyticsService.getWatch10sRate7d(topVideoId);
      const avgWatch = await analyticsService.getAvgWatch7d(topVideoId);
      console.log(`Watch 10s Rate: ${watch10sRate !== null ? (watch10sRate * 100).toFixed(1) + '%' : 'N/A'}`);
      console.log(`Avg Watch Duration: ${avgWatch !== null ? avgWatch.toFixed(1) + 's' : 'N/A'}`);
      
      // Test 4: Batch stats
      console.log(`\nTest 4: Batch Stats for Top 5 Videos`);
      const topVideoIds = trending.slice(0, 5).map(v => v.video_id);
      const batchStats = await analyticsService.getBatchVideoStats(topVideoIds, 5);
      console.log(`Retrieved stats for ${batchStats.size} videos:`);
      batchStats.forEach((stat, videoId) => {
        console.log(`  Video ${videoId}: ${stat.watch_10s_rate !== null ? (stat.watch_10s_rate * 100).toFixed(1) + '%' : 'N/A'} watch10s rate, ${stat.impression_count} impressions`);
      });
      
    } else {
      console.log('No trending videos found. This might be normal if there are no watch events in the last 7 days.');
      console.log('You can create some test watch events using test_impression_api.js');
    }
    
    console.log('\n✅ All analytics tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
  
  process.exit(0);
}

testAnalytics();
