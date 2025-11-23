/**
 * Seeder: Admin Users
 * 
 * Creates initial admin accounts for system management.
 */

import bcrypt from 'bcrypt';

/**
 * Admin users to seed
 * WARNING: Change these credentials in production!
 */
const adminUsers = [
  {
    username: 'admin',
    email: 'admin@clipiq.com',
    password: 'Admin@123456', // Change in production!
    role: 'admin',
    display_name: 'System Administrator',
    bio: 'Main system administrator account'
  },
  {
    username: 'admin2',
    email: 'admin2@clipiq.com',
    password: 'Admin@123456', // Change in production!
    role: 'admin',
    display_name: 'Secondary Administrator',
    bio: 'Backup system administrator'
  }
];

/**
 * Seed admin users
 */
export async function seed(client) {
  console.log('   Seeding admin users...');
  
  // Check environment
  if (process.env.NODE_ENV === 'production') {
    console.warn('   ⚠️  WARNING: Using default admin passwords in production!');
    console.warn('   ⚠️  Please change these immediately after seeding!');
  }
  
  let insertedCount = 0;
  let skippedCount = 0;
  
  for (const user of adminUsers) {
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
        user.role,
        user.display_name,
        user.bio
      ]
    );
    
    console.log(`   ✅ Created ${user.role}: ${result.rows[0].username} (${result.rows[0].email})`);
    insertedCount++;
  }
  
  console.log(`   📊 Summary: ${insertedCount} inserted, ${skippedCount} skipped`);
  
  if (insertedCount > 0 && process.env.NODE_ENV === 'production') {
    console.log('\n   🔐 SECURITY REMINDER:');
    console.log('   Please change admin passwords immediately:');
    adminUsers.forEach(u => {
      console.log(`   - ${u.username}: ${u.email}`);
    });
  }
}

export default seed;
