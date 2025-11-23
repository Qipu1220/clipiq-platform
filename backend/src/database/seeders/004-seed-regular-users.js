/**
 * Seeder: Regular Users
 * 
 * Creates 50 regular user accounts for testing the platform.
 * Each user will upload 2 videos.
 */

import bcrypt from 'bcrypt';

/**
 * Regular users to seed (50 users)
 * Password: User@123456 for all users
 */
const regularUsers = [
  { username: 'user001', email: 'user001@test.com', display_name: 'Alex Thompson', bio: 'Tech enthusiast sharing coding tutorials and reviews' },
  { username: 'user002', email: 'user002@test.com', display_name: 'Maria Garcia', bio: 'Lifestyle vlogger and travel content creator' },
  { username: 'user003', email: 'user003@test.com', display_name: 'James Wilson', bio: 'Gaming streams and walkthroughs' },
  { username: 'user004', email: 'user004@test.com', display_name: 'Sarah Chen', bio: 'Cooking and recipe videos for busy professionals' },
  { username: 'user005', email: 'user005@test.com', display_name: 'Michael Brown', bio: 'Fitness trainer and workout routines' },
  { username: 'user006', email: 'user006@test.com', display_name: 'Emma Davis', bio: 'DIY crafts and home decoration ideas' },
  { username: 'user007', email: 'user007@test.com', display_name: 'David Lee', bio: 'Photography tips and camera gear reviews' },
  { username: 'user008', email: 'user008@test.com', display_name: 'Olivia Martinez', bio: 'Fashion and beauty content creator' },
  { username: 'user009', email: 'user009@test.com', display_name: 'Daniel Kim', bio: 'Educational science experiments and explanations' },
  { username: 'user010', email: 'user010@test.com', display_name: 'Sophia Rodriguez', bio: 'Music covers and original compositions' },
  { username: 'user011', email: 'user011@test.com', display_name: 'Ethan Anderson', bio: 'Car reviews and automotive maintenance tips' },
  { username: 'user012', email: 'user012@test.com', display_name: 'Isabella Taylor', bio: 'Pet care and animal training videos' },
  { username: 'user013', email: 'user013@test.com', display_name: 'Mason Thomas', bio: 'Woodworking projects and furniture building' },
  { username: 'user014', email: 'user014@test.com', display_name: 'Ava Jackson', bio: 'Language learning and polyglot tips' },
  { username: 'user015', email: 'user015@test.com', display_name: 'Lucas White', bio: 'Drone footage and aerial cinematography' },
  { username: 'user016', email: 'user016@test.com', display_name: 'Mia Harris', bio: 'Meditation and mental health wellness' },
  { username: 'user017', email: 'user017@test.com', display_name: 'Noah Martin', bio: 'Gardening and urban farming tutorials' },
  { username: 'user018', email: 'user018@test.com', display_name: 'Charlotte Clark', bio: 'Book reviews and literary discussions' },
  { username: 'user019', email: 'user019@test.com', display_name: 'Liam Lewis', bio: 'Entrepreneurship and startup advice' },
  { username: 'user020', email: 'user020@test.com', display_name: 'Amelia Walker', bio: 'Yoga and pilates instructional videos' },
  { username: 'user021', email: 'user021@test.com', display_name: 'Benjamin Hall', bio: 'History documentaries and educational content' },
  { username: 'user022', email: 'user022@test.com', display_name: 'Harper Allen', bio: 'Makeup tutorials and skincare routines' },
  { username: 'user023', email: 'user023@test.com', display_name: 'Elijah Young', bio: 'Sports highlights and athletic training' },
  { username: 'user024', email: 'user024@test.com', display_name: 'Evelyn King', bio: 'Interior design and home staging tips' },
  { username: 'user025', email: 'user025@test.com', display_name: 'Logan Wright', bio: 'Cycling adventures and bike maintenance' },
  { username: 'user026', email: 'user026@test.com', display_name: 'Abigail Scott', bio: 'Baking and dessert recipe tutorials' },
  { username: 'user027', email: 'user027@test.com', display_name: 'Jackson Green', bio: 'Fishing tips and outdoor adventures' },
  { username: 'user028', email: 'user028@test.com', display_name: 'Emily Adams', bio: 'Sustainable living and eco-friendly tips' },
  { username: 'user029', email: 'user029@test.com', display_name: 'Aiden Baker', bio: 'Magic tricks and illusion tutorials' },
  { username: 'user030', email: 'user030@test.com', display_name: 'Scarlett Nelson', bio: 'Dance choreography and performance videos' },
  { username: 'user031', email: 'user031@test.com', display_name: 'Sebastian Carter', bio: '3D printing projects and maker content' },
  { username: 'user032', email: 'user032@test.com', display_name: 'Victoria Mitchell', bio: 'Personal finance and investment advice' },
  { username: 'user033', email: 'user033@test.com', display_name: 'Henry Perez', bio: 'Architecture and building design showcases' },
  { username: 'user034', email: 'user034@test.com', display_name: 'Grace Roberts', bio: 'Parenting tips and family vlogs' },
  { username: 'user035', email: 'user035@test.com', display_name: 'Samuel Turner', bio: 'Coffee brewing techniques and cafe tours' },
  { username: 'user036', email: 'user036@test.com', display_name: 'Lily Phillips', bio: 'Art tutorials and painting techniques' },
  { username: 'user037', email: 'user037@test.com', display_name: 'Jack Campbell', bio: 'Stand-up comedy and funny sketches' },
  { username: 'user038', email: 'user038@test.com', display_name: 'Zoe Parker', bio: 'Travel guides and destination reviews' },
  { username: 'user039', email: 'user039@test.com', display_name: 'Owen Evans', bio: 'Astronomy and space exploration content' },
  { username: 'user040', email: 'user040@test.com', display_name: 'Chloe Edwards', bio: 'Wedding planning and event organization' },
  { username: 'user041', email: 'user041@test.com', display_name: 'Wyatt Collins', bio: 'Hiking trails and camping gear reviews' },
  { username: 'user042', email: 'user042@test.com', display_name: 'Aria Stewart', bio: 'Voice acting and dubbing tutorials' },
  { username: 'user043', email: 'user043@test.com', display_name: 'Grayson Morris', bio: 'Real estate tours and property investment' },
  { username: 'user044', email: 'user044@test.com', display_name: 'Hannah Rogers', bio: 'Jewelry making and accessory design' },
  { username: 'user045', email: 'user045@test.com', display_name: 'Carter Reed', bio: 'Electronic music production and DJ sets' },
  { username: 'user046', email: 'user046@test.com', display_name: 'Nora Cook', bio: 'Graphic design tutorials and portfolio reviews' },
  { username: 'user047', email: 'user047@test.com', display_name: 'Julian Morgan', bio: 'Martial arts training and self-defense' },
  { username: 'user048', email: 'user048@test.com', display_name: 'Penelope Bell', bio: 'Wine tasting and sommelier recommendations' },
  { username: 'user049', email: 'user049@test.com', display_name: 'Ryan Murphy', bio: 'Cryptocurrency and blockchain explained' },
  { username: 'user050', email: 'user050@test.com', display_name: 'Layla Rivera', bio: 'Street food tours and culinary adventures' }
];

/**
 * Seed regular users
 */
export async function seed(client) {
  console.log('   Seeding 50 regular users...');
  
  const password = 'User@123456';
  const passwordHash = await bcrypt.hash(password, 10);
  
  let insertedCount = 0;
  let skippedCount = 0;
  
  for (const user of regularUsers) {
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [user.email, user.username]
    );
    
    if (existingUser.rows.length > 0) {
      skippedCount++;
      continue;
    }
    
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
      RETURNING id, username, email`,
      [
        user.username,
        user.email,
        passwordHash,
        'user',
        user.display_name,
        user.bio
      ]
    );
    
    insertedCount++;
    
    // Log every 10 users to avoid spam
    if (insertedCount % 10 === 0) {
      console.log(`   ✅ Created ${insertedCount} users...`);
    }
  }
  
  console.log(`   📊 Summary: ${insertedCount} inserted, ${skippedCount} skipped`);
  console.log(`   🔑 Default password for all users: ${password}`);
}

export default seed;
