/**
 * Seeder: User Interactions for Recommendation Testing
 * 
 * Creates rich interaction data for user001 and other users:
 * - Likes, views, comments
 * - Trending videos (high view counts)
 * - Tags and categories assignment
 * - Subscriptions/follows
 */

/**
 * Seed user interactions and recommendation data
 */
export async function seed(client) {
  console.log('   Seeding user interactions for recommendation testing...');
  
  try {
    // 1. Get user001 ID
    const user001Result = await client.query(
      `SELECT id FROM users WHERE username = 'user001' LIMIT 1`
    );
    
    if (user001Result.rows.length === 0) {
      console.error('   ❌ user001 not found. Run 004-seed-regular-users.js first');
      return;
    }
    
    const user001Id = user001Result.rows[0].id;
    console.log(`   ✅ Found user001: ${user001Id}`);
    
    // 2. Get all videos and categorize them
    const videosResult = await client.query(`
      SELECT id, title, description, uploader_id, views
      FROM videos 
      ORDER BY created_at 
      LIMIT 100
    `);
    
    const videos = videosResult.rows;
    console.log(`   📹 Found ${videos.length} videos`);
    
    // 3. Create trending videos (boost views for some videos)
    console.log('   📈 Creating trending videos...');
    const trendingIndices = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45]; // 10 trending videos
    
    for (const index of trendingIndices) {
      if (videos[index]) {
        const trendingViews = Math.floor(Math.random() * 5000) + 5000; // 5000-10000 views
        await client.query(
          `UPDATE videos SET views = $1 WHERE id = $2`,
          [trendingViews, videos[index].id]
        );
      }
    }
    
    // 4. user001 likes videos (Tech, Gaming, Music categories)
    console.log('   ❤️  Creating likes for user001...');
    const likesCount = Math.min(5, videos.length); // Reduced from 25 to 5 for testing
    
    for (let i = 0; i < likesCount; i++) {
      const video = videos[i];
      if (video.uploader_id !== user001Id) { // Don't like own videos
        await client.query(
          `INSERT INTO likes (user_id, video_id, created_at)
           VALUES ($1, $2, NOW() - INTERVAL '${Math.floor(Math.random() * 30)} days')
           ON CONFLICT (user_id, video_id) DO NOTHING`,
          [user001Id, video.id]
        );
        
        // Update likes count
        await client.query(
          `UPDATE videos SET likes_count = likes_count + 1 WHERE id = $1`,
          [video.id]
        );
      }
    }
    
    // 5. user001 views videos (watch history)
    console.log('   👁️  Creating view history for user001...');
    const viewsCount = Math.min(10, videos.length); // Reduced from 40 to 10 for testing
    
    for (let i = 0; i < viewsCount; i++) {
      const video = videos[i];
      const watchDuration = Math.floor(Math.random() * 600) + 30; // 30-630 seconds
      const completed = Math.random() > 0.3; // 70% completion rate
      
      // Check if view history exists
      const existingView = await client.query(
        `SELECT id FROM view_history WHERE user_id = $1 AND video_id = $2`,
        [user001Id, video.id]
      );
      
      if (existingView.rows.length === 0) {
        await client.query(
          `INSERT INTO view_history (user_id, video_id, watch_duration, completed, created_at)
           VALUES ($1, $2, $3, $4, NOW() - INTERVAL '${Math.floor(Math.random() * 60)} days')`,
          [user001Id, video.id, watchDuration, completed]
        );
      }
    }
    
    // 6. user001 comments on videos
    console.log('   💬 Creating comments for user001...');
    const commentTexts = [
      'Great video! Really helpful 👍',
      'Thanks for sharing this!',
      'Love your content, keep it up!',
      'This is exactly what I needed',
      'Amazing tutorial!',
      'Very informative, thanks!',
      'Can you make more videos like this?',
      'Subscribed! 🔔',
      'This helped me so much!',
      'Best explanation I\'ve seen'
    ];
    
    const commentsCount = Math.min(3, videos.length); // Reduced from 15 to 3 for testing
    
    for (let i = 0; i < commentsCount; i++) {
      const video = videos[i];
      const randomComment = commentTexts[Math.floor(Math.random() * commentTexts.length)];
      
      await client.query(
        `INSERT INTO comments (user_id, video_id, text, created_at)
         VALUES ($1, $2, $3, NOW() - INTERVAL '${Math.floor(Math.random() * 45)} days')
         ON CONFLICT DO NOTHING`,
        [user001Id, video.id, randomComment]
      );
      
      // Update comments count
      await client.query(
        `UPDATE videos SET comments_count = comments_count + 1 WHERE id = $1`,
        [video.id]
      );
    }
    
    // 7. user001 saves videos (bookmarks)
    console.log('   🔖 Creating saved videos for user001...');
    
    // Get or create "Đã lưu" playlist
    const existingPlaylist = await client.query(
      `SELECT id FROM playlists WHERE user_id = $1 AND name = 'Đã lưu'`,
      [user001Id]
    );
    
    let playlistId;
    if (existingPlaylist.rows.length > 0) {
      playlistId = existingPlaylist.rows[0].id;
      console.log('   ℹ️  Using existing "Đã lưu" playlist');
    } else {
      const playlistResult = await client.query(
        `INSERT INTO playlists (user_id, name, description, visibility)
         VALUES ($1, 'Đã lưu', 'My saved videos', 'private')
         RETURNING id`,
        [user001Id]
      );
      playlistId = playlistResult.rows[0].id;
      console.log('   ✅ Created "Đã lưu" playlist');
    }
    // Get max position to continue from
    const maxPosResult = await client.query(
      `SELECT COALESCE(MAX(position), -1) as max_pos FROM playlist_videos WHERE playlist_id = $1`,
      [playlistId]
    );
    let nextPosition = maxPosResult.rows[0].max_pos + 1;
    
    const savedCount = Math.min(3, videos.length); // Reduced from 12 to 3 for testing
    let addedCount = 0;
    
    for (let i = 0; i < savedCount; i++) {
      const video = videos[i];
      
      // Check if already in playlist
      const existingEntry = await client.query(
        `SELECT id FROM playlist_videos WHERE playlist_id = $1 AND video_id = $2`,
        [playlistId, video.id]
      );
      
      if (existingEntry.rows.length === 0) {
        await client.query(
          `INSERT INTO playlist_videos (playlist_id, video_id, position, added_at)
           VALUES ($1, $2, $3, NOW() - INTERVAL '${Math.floor(Math.random() * 40)} days')`,
          [playlistId, video.id, nextPosition]
        );
        nextPosition++;
        addedCount++;
      }
    }
    
    console.log(`   ✅ Added ${addedCount} videos to saved playlist`);
    
    // 8. user001 follows other users
    console.log('   👥 Creating subscriptions for user001...');
    const followUsers = ['user002', 'user003', 'user005', 'user010', 'user015', 'user020', 'user025', 'user030'];
    
    for (const username of followUsers) {
      const followedUserResult = await client.query(
        `SELECT id FROM users WHERE username = $1`,
        [username]
      );
      
      if (followedUserResult.rows.length > 0) {
        await client.query(
          `INSERT INTO subscriptions (follower_id, following_id, created_at)
           VALUES ($1, $2, NOW() - INTERVAL '${Math.floor(Math.random() * 50)} days')
           ON CONFLICT (follower_id, following_id) DO NOTHING`,
          [user001Id, followedUserResult.rows[0].id]
        );
      }
    }
    
    // 9. Create interactions from other users to make ecosystem realistic
    console.log('   🌐 Creating interactions from other users...');
    
    const otherUsersResult = await client.query(`
      SELECT id FROM users 
      WHERE role = 'user' AND username != 'user001'
      ORDER BY RANDOM()
      LIMIT 20
    `);
    
    for (const user of otherUsersResult.rows) {
      // Each user likes 3-8 random videos
      const userLikesCount = Math.floor(Math.random() * 6) + 3;
      const shuffledVideos = [...videos].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < userLikesCount && i < shuffledVideos.length; i++) {
        await client.query(
          `INSERT INTO likes (user_id, video_id, created_at)
           VALUES ($1, $2, NOW() - INTERVAL '${Math.floor(Math.random() * 20)} days')
           ON CONFLICT DO NOTHING`,
          [user.id, shuffledVideos[i].id]
        );
        
        await client.query(
          `UPDATE videos SET likes_count = likes_count + 1 WHERE id = $1`,
          [shuffledVideos[i].id]
        );
      }
      
      // Each user views 5-15 random videos
      const userViewsCount = Math.floor(Math.random() * 11) + 5;
      for (let i = 0; i < userViewsCount && i < shuffledVideos.length; i++) {
        // Check if view already exists
        const existingView = await client.query(
          `SELECT id FROM view_history WHERE user_id = $1 AND video_id = $2`,
          [user.id, shuffledVideos[i].id]
        );
        
        if (existingView.rows.length === 0) {
          await client.query(
            `INSERT INTO view_history (user_id, video_id, watch_duration, completed, created_at)
             VALUES ($1, $2, $3, $4, NOW() - INTERVAL '${Math.floor(Math.random() * 25)} days')`,
            [user.id, shuffledVideos[i].id, Math.floor(Math.random() * 400) + 50, Math.random() > 0.4]
          );
        }
      }
    }
    
    // 10. Update video views to match view_history
    console.log('   📊 Updating video view counts...');
    await client.query(`
      UPDATE videos v
      SET views = (
        SELECT COUNT(*) 
        FROM view_history vh 
        WHERE vh.video_id = v.id
      )
    `);
    
    console.log('   ✅ Interaction data seeded successfully!');
    console.log('');
    console.log('   📈 Summary for user001:');
    
    // Show summary
    const likesCountResult = await client.query(
      `SELECT COUNT(*) FROM likes WHERE user_id = $1`,
      [user001Id]
    );
    
    const viewsCountResult = await client.query(
      `SELECT COUNT(*) FROM view_history WHERE user_id = $1`,
      [user001Id]
    );
    
    const commentsCountResult = await client.query(
      `SELECT COUNT(*) FROM comments WHERE user_id = $1`,
      [user001Id]
    );
    
    const savedCountResult = await client.query(
      `SELECT COUNT(*) FROM playlist_videos pv 
       JOIN playlists p ON pv.playlist_id = p.id
       WHERE p.user_id = $1`,
      [user001Id]
    );
    
    const followsCountResult = await client.query(
      `SELECT COUNT(*) FROM subscriptions WHERE follower_id = $1`,
      [user001Id]
    );
    
    console.log(`      ❤️  Liked videos: ${likesCountResult.rows[0].count}`);
    console.log(`      👁️  Watched videos: ${viewsCountResult.rows[0].count}`);
    console.log(`      💬 Comments: ${commentsCountResult.rows[0].count}`);
    console.log(`      🔖 Saved videos: ${savedCountResult.rows[0].count}`);
    console.log(`      👥 Following: ${followsCountResult.rows[0].count} users`);
    
  } catch (error) {
    console.error('   ❌ Error seeding interactions:', error.message);
    throw error;
  }
}

export default seed;

