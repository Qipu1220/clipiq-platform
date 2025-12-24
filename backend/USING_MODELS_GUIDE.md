# Hướng Dẫn Sử Dụng Models

Hiện tại dự án đang dùng **raw SQL queries**. Nếu muốn sử dụng models, có 3 cách sau:

---

## 🎯 **Cách 1: Sử dụng Sequelize ORM (Khuyến nghị)**

### **Bước 1: Cài đặt**
```bash
npm install sequelize pg pg-hstore
```

### **Bước 2: Tạo Sequelize models**

**File: `backend/src/models/sequelize/Comment.model.js`**
```javascript
import { DataTypes } from 'sequelize';

export default function(sequelize) {
  const Comment = sequelize.define('Comment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    video_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'videos',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: {
          args: [1, 2000],
          msg: 'Comment must be between 1 and 2000 characters'
        }
      }
    }
  }, {
    tableName: 'comments',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Associations
  Comment.associate = function(models) {
    Comment.belongsTo(models.Video, { foreignKey: 'video_id' });
    Comment.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  return Comment;
}
```

**File: `backend/src/models/sequelize/index.js`**
```javascript
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import CommentModel from './Comment.model.js';
import VideoModel from './Video.model.js';
import UserModel from './User.model.js';

dotenv.config();

const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  logging: false
});

// Initialize models
const Comment = CommentModel(sequelize);
const Video = VideoModel(sequelize);
const User = UserModel(sequelize);

// Setup associations
const models = { Comment, Video, User };
Object.values(models).forEach(model => {
  if (model.associate) {
    model.associate(models);
  }
});

export { sequelize, Comment, Video, User };
```

### **Bước 3: Sử dụng trong Service**

**Trước (Raw SQL):**
```javascript
// comment.service.js
export async function getCommentsByVideoId(videoId, limitNum, offset) {
  const result = await pool.query(
    `SELECT c.*, u.username, u.display_name, u.avatar_url
     FROM comments c
     LEFT JOIN users u ON c.user_id = u.id
     WHERE c.video_id = $1
     ORDER BY c.created_at DESC
     LIMIT $2 OFFSET $3`,
    [videoId, limitNum, offset]
  );
  return result.rows;
}
```

**Sau (Sequelize):**
```javascript
// comment.service.js
import { Comment, User } from '../models/sequelize/index.js';

export async function getCommentsByVideoId(videoId, limitNum, offset) {
  const comments = await Comment.findAll({
    where: { video_id: videoId },
    include: [{
      model: User,
      attributes: ['username', 'display_name', 'avatar_url']
    }],
    order: [['created_at', 'DESC']],
    limit: limitNum,
    offset: offset
  });
  
  return comments;
}

export async function createComment(videoId, userId, text) {
  const comment = await Comment.create({
    video_id: videoId,
    user_id: userId,
    text: text
  });
  
  return comment;
}

export async function deleteCommentById(commentId) {
  await Comment.destroy({
    where: { id: commentId }
  });
}
```

---

## 🎯 **Cách 2: Tạo Query Builder từ Schema**

Tạo một helper function tự động generate SQL từ schema hiện tại:

**File: `backend/src/utils/queryBuilder.js`**
```javascript
import pool from '../config/database.js';

class QueryBuilder {
  constructor(schema) {
    this.tableName = schema.tableName;
    this.schema = schema;
  }

  async findAll(options = {}) {
    const { where = {}, limit, offset, orderBy } = options;
    
    let query = `SELECT * FROM ${this.tableName}`;
    const params = [];
    let paramCount = 1;

    // WHERE clause
    if (Object.keys(where).length > 0) {
      const conditions = Object.entries(where).map(([key, value]) => {
        params.push(value);
        return `${key} = $${paramCount++}`;
      });
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // ORDER BY
    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }

    // LIMIT & OFFSET
    if (limit) {
      query += ` LIMIT $${paramCount++}`;
      params.push(limit);
    }
    if (offset) {
      query += ` OFFSET $${paramCount++}`;
      params.push(offset);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  async findOne(where) {
    const conditions = Object.entries(where).map(([key, value], i) => 
      `${key} = $${i + 1}`
    );
    const query = `SELECT * FROM ${this.tableName} WHERE ${conditions.join(' AND ')} LIMIT 1`;
    const params = Object.values(where);
    
    const result = await pool.query(query, params);
    return result.rows[0];
  }

  async create(data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`);

    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async update(where, data) {
    const setClause = Object.keys(data).map((key, i) => 
      `${key} = $${i + 1}`
    );
    const whereClause = Object.keys(where).map((key, i) => 
      `${key} = $${i + 1 + Object.keys(data).length}`
    );

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause.join(', ')}
      WHERE ${whereClause.join(' AND ')}
      RETURNING *
    `;

    const params = [...Object.values(data), ...Object.values(where)];
    const result = await pool.query(query, params);
    return result.rows[0];
  }

  async delete(where) {
    const conditions = Object.entries(where).map(([key, value], i) => 
      `${key} = $${i + 1}`
    );
    const query = `DELETE FROM ${this.tableName} WHERE ${conditions.join(' AND ')}`;
    const params = Object.values(where);
    
    await pool.query(query, params);
  }
}

export default QueryBuilder;
```

**Sử dụng:**
```javascript
// comment.service.js
import QueryBuilder from '../utils/queryBuilder.js';
import { CommentSchema } from '../models/Comment.js';

const CommentModel = new QueryBuilder(CommentSchema);

export async function getCommentsByVideoId(videoId, limitNum, offset) {
  return await CommentModel.findAll({
    where: { video_id: videoId },
    orderBy: 'created_at DESC',
    limit: limitNum,
    offset: offset
  });
}

export async function createComment(videoId, userId, text) {
  return await CommentModel.create({
    id: crypto.randomUUID(),
    video_id: videoId,
    user_id: userId,
    text: text
  });
}

export async function deleteCommentById(commentId) {
  await CommentModel.delete({ id: commentId });
}
```

---

## 🎯 **Cách 3: Prisma ORM (Modern & Type-safe)**

### **Bước 1: Cài đặt**
```bash
npm install prisma @prisma/client
npx prisma init
```

### **Bước 2: Tạo Prisma schema**

**File: `prisma/schema.prisma`**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id          String    @id @default(uuid()) @db.Uuid
  username    String    @unique @db.VarChar(50)
  email       String    @unique @db.VarChar(255)
  password    String    @db.VarChar(255)
  role        String    @default("user") @db.VarChar(20)
  created_at  DateTime  @default(now())
  updated_at  DateTime  @updatedAt
  
  comments    Comment[]
  videos      Video[]
  
  @@map("users")
}

model Video {
  id            String    @id @default(uuid()) @db.Uuid
  title         String    @db.VarChar(255)
  description   String?   @db.Text
  uploader_id   String    @db.Uuid
  video_url     String    @db.Text
  thumbnail_url String?   @db.Text
  views         Int       @default(0)
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt
  
  uploader      User      @relation(fields: [uploader_id], references: [id], onDelete: Cascade)
  comments      Comment[]
  
  @@map("videos")
}

model Comment {
  id         String   @id @default(uuid()) @db.Uuid
  video_id   String   @db.Uuid
  user_id    String   @db.Uuid
  text       String   @db.Text
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
  
  video      Video    @relation(fields: [video_id], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@index([video_id])
  @@index([user_id])
  @@map("comments")
}
```

### **Bước 3: Generate Prisma Client**
```bash
npx prisma db pull  # Pull schema từ database hiện tại
npx prisma generate # Generate client
```

### **Bước 4: Sử dụng**
```javascript
// comment.service.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function getCommentsByVideoId(videoId, limitNum, offset) {
  return await prisma.comment.findMany({
    where: { video_id: videoId },
    include: {
      user: {
        select: {
          username: true,
          display_name: true,
          avatar_url: true
        }
      }
    },
    orderBy: { created_at: 'desc' },
    take: limitNum,
    skip: offset
  });
}

export async function createComment(videoId, userId, text) {
  return await prisma.comment.create({
    data: {
      video_id: videoId,
      user_id: userId,
      text: text
    }
  });
}

export async function deleteCommentById(commentId) {
  await prisma.comment.delete({
    where: { id: commentId }
  });
}
```

---

## 📊 **So Sánh**

| Tiêu chí | Raw SQL | Sequelize | Query Builder | Prisma |
|----------|---------|-----------|---------------|--------|
| **Performance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Type Safety** | ❌ | ⚠️ | ❌ | ✅ |
| **Learning Curve** | Dễ | Trung bình | Dễ | Trung bình |
| **Code Maintainability** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Migration Support** | Thủ công | ✅ | ❌ | ✅ |
| **Setup Time** | Nhanh | Trung bình | Nhanh | Trung bình |

---

## 💡 **Khuyến Nghị**

1. **Dự án nhỏ/prototype**: Giữ nguyên Raw SQL hoặc dùng Query Builder (Cách 2)
2. **Dự án vừa**: Sequelize (Cách 1)
3. **Dự án lớn/TypeScript**: Prisma (Cách 3)

---

## ⚠️ **Lưu Ý Khi Migration**

1. **Backup database** trước khi chuyển đổi
2. **Test kỹ** tất cả queries
3. **Kiểm tra performance** sau khi chuyển
4. **Update validation** logic nếu cần
5. **Cập nhật tests** cho tất cả services

---

**Cần hỗ trợ implement cách nào không?**
