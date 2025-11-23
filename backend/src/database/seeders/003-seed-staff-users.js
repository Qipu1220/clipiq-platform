/**
 * Seeder: Staff Users
 * 
 * Creates staff accounts for content moderation and platform management.
 */

import bcrypt from 'bcrypt';

/**
 * Staff users to seed
 * WARNING: Change these credentials in production!
 */
const staffUsers = [
  {
    username: 'staff_mod1',
    email: 'mod1@clipiq.com',
    password: 'Staff@123456',
    display_name: 'Content Moderator',
    bio: 'Content moderation specialist'
  },
  {
    username: 'staff_mod2',
    email: 'mod2@clipiq.com',
    password: 'Staff@123456',
    display_name: 'User Support',
    bio: 'User support and community management'
  },
  {
    username: 'staff_mod3',
    email: 'mod3@clipiq.com',
    password: 'Staff@123456',
    display_name: 'Video Reviewer',
    bio: 'Video content review and approval'
  },
  {
    username: 'staff_mod4',
    email: 'mod4@clipiq.com',
    password: 'Staff@123456',
    display_name: 'Report Handler',
    bio: 'Handles user reports and complaints'
  },
  {
    username: 'staff_mod5',
    email: 'mod5@clipiq.com',
    password: 'Staff@123456',
    display_name: 'Quality Control',
    bio: 'Quality assurance and content standards'
  },
  {
    username: 'staff_mod6',
    email: 'mod6@clipiq.com',
    password: 'Staff@123456',
    display_name: 'Community Manager',
    bio: 'Community engagement and events'
  },
  {
    username: 'staff_mod7',
    email: 'mod7@clipiq.com',
    password: 'Staff@123456',
    display_name: 'Technical Support',
    bio: 'Technical issues and troubleshooting'
  },
  {
    username: 'staff_mod8',
    email: 'mod8@clipiq.com',
    password: 'Staff@123456',
    display_name: 'Content Curator',
    bio: 'Featured content selection and curation'
  },
  {
    username: 'staff_mod9',
    email: 'mod9@clipiq.com',
    password: 'Staff@123456',
    display_name: 'Policy Enforcement',
    bio: 'Policy compliance and enforcement'
  },
  {
    username: 'staff_mod10',
    email: 'mod10@clipiq.com',
    password: 'Staff@123456',
    display_name: 'Analytics Monitor',
    bio: 'Platform analytics and metrics monitoring'
  }
];

/**
 * Seed staff users
 */
export async function seed(client) {
  console.log('   Seeding staff users...');
  
  // Check environment
  if (process.env.NODE_ENV === 'production') {
    console.warn('   ⚠️  WARNING: Using default staff passwords in production!');
    console.warn('   ⚠️  Please change these immediately after seeding!');
  }
  
  let insertedCount = 0;
  let skippedCount = 0;
  
  for (const user of staffUsers) {
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [user.email, user.username]
    );
    
    if (existingUser.rows.length > 0) {
      console.log(`   ⏭️  User '${user.username}' already exists, skipping`);
      skippedCount++;
      continue;
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(user.password, 10);
    
    // Insert user
    const result = await client.query(
      `INSERT INTO users (
        username, 
        email, 
        password, 
        role, 
        display_name, 
        bio,
        banned,
        warnings
      ) VALUES ($1, $2, $3, $4, $5, $6, false, 0)
      RETURNING id, username, email, role`,
      [
        user.username,
        user.email,
        passwordHash,
        'staff',
        user.display_name,
        user.bio
      ]
    );
    
    console.log(`   ✅ Created staff: ${result.rows[0].username} (${result.rows[0].email})`);
    insertedCount++;
  }
  
  console.log(`   📊 Summary: ${insertedCount} inserted, ${skippedCount} skipped`);
  
  if (insertedCount > 0 && process.env.NODE_ENV === 'production') {
    console.log('\n   🔐 SECURITY REMINDER:');
    console.log('   Please change staff passwords immediately');
  }
}

export default seed;
