/**
 * Seeder: System Settings
 * 
 * Initialize default system configuration.
 */

/**
 * Default system settings
 */
const systemSettings = [
  {
    key: 'site_name',
    value: 'ClipIQ Platform',
    description: 'Name of the platform displayed in UI'
  },
  {
    key: 'site_description',
    value: 'Video sharing platform for creative content',
    description: 'Platform description for SEO'
  },
  {
    key: 'max_upload_size_mb',
    value: '500',
    description: 'Maximum video upload size in megabytes'
  },
  {
    key: 'max_video_duration_seconds',
    value: '3600',
    description: 'Maximum video duration in seconds (1 hour)'
  },
  {
    key: 'allowed_video_formats',
    value: 'mp4,webm,mov,avi',
    description: 'Comma-separated list of allowed video formats'
  },
  {
    key: 'maintenance_mode',
    value: 'false',
    description: 'Enable/disable maintenance mode (true/false)'
  },
  {
    key: 'allow_user_registration',
    value: 'true',
    description: 'Allow new user registrations (true/false)'
  },
  {
    key: 'require_email_verification',
    value: 'true',
    description: 'Require email verification for new accounts'
  },
  {
    key: 'default_videos_per_page',
    value: '20',
    description: 'Default number of videos per page in listings'
  },
  {
    key: 'enable_comments',
    value: 'true',
    description: 'Enable/disable comments globally'
  },
  {
    key: 'enable_likes',
    value: 'true',
    description: 'Enable/disable likes globally'
  },
  {
    key: 'auto_ban_threshold',
    value: '3',
    description: 'Number of warnings before automatic ban'
  },
  {
    key: 'report_review_required',
    value: 'true',
    description: 'Require staff review for all reports'
  },
  {
    key: 'max_comment_length',
    value: '1000',
    description: 'Maximum comment length in characters'
  },
  {
    key: 'thumbnail_quality',
    value: '80',
    description: 'JPEG quality for auto-generated thumbnails (0-100)'
  },
  {
    key: 'video_processing_enabled',
    value: 'true',
    description: 'Enable automatic video processing (transcoding, thumbnails)'
  },
  {
    key: 'minio_bucket_videos',
    value: 'videos',
    description: 'MinIO bucket name for video files'
  },
  {
    key: 'minio_bucket_thumbnails',
    value: 'thumbnails',
    description: 'MinIO bucket name for thumbnail images'
  },
  {
    key: 'minio_bucket_avatars',
    value: 'avatars',
    description: 'MinIO bucket name for user avatars'
  },
  {
    key: 'session_timeout_minutes',
    value: '60',
    description: 'User session timeout in minutes'
  }
];

/**
 * Seed system settings
 */
export async function seed(client) {
  console.log('   Seeding system settings...');
  
  let insertedCount = 0;
  let updatedCount = 0;
  
  for (const setting of systemSettings) {
    // Check if setting already exists
    const existingSetting = await client.query(
      'SELECT key, value FROM system_settings WHERE key = $1',
      [setting.key]
    );
    
    if (existingSetting.rows.length > 0) {
      // Update if value is different
      const currentValue = existingSetting.rows[0].value;
      if (currentValue !== setting.value) {
        await client.query(
          'UPDATE system_settings SET value = $1, description = $2, updated_at = NOW() WHERE key = $3',
          [setting.value, setting.description, setting.key]
        );
        console.log(`   🔄 Updated: ${setting.key} = ${setting.value}`);
        updatedCount++;
      } else {
        // Skip if value is the same
        continue;
      }
    } else {
      // Insert new setting
      await client.query(
        'INSERT INTO system_settings (key, value, description) VALUES ($1, $2, $3)',
        [setting.key, setting.value, setting.description]
      );
      console.log(`   ✅ Created: ${setting.key} = ${setting.value}`);
      insertedCount++;
    }
  }
  
  console.log(`   📊 Summary: ${insertedCount} inserted, ${updatedCount} updated`);
  
  // Display current settings
  const allSettings = await client.query(
    'SELECT key, value FROM system_settings ORDER BY key'
  );
  
  console.log(`   📋 Total settings in database: ${allSettings.rows.length}`);
}

export default seed;
