/**
 * User Model Schema
 * Defines the structure and validation rules for User entity
 */

export const UserSchema = {
    tableName: 'users',
    columns: {
        id: {
            type: 'UUID',
            primaryKey: true,
            default: 'uuid_generate_v4()',
            nullable: false
        },
        username: {
            type: 'VARCHAR(50)',
            unique: true,
            nullable: false,
            validation: {
                minLength: 3,
                maxLength: 50,
                pattern: /^[a-zA-Z0-9_]+$/,
                message: 'Username must be 3-50 characters and contain only letters, numbers, and underscores'
            }
        },
        email: {
            type: 'VARCHAR(255)',
            unique: true,
            nullable: false,
            validation: {
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Invalid email format'
            }
        },
        password_hash: {
            type: 'VARCHAR(255)',
            nullable: false
        },
        role: {
            type: 'VARCHAR(20)',
            default: 'user',
            nullable: false,
            validation: {
                enum: ['user', 'admin'],
                message: 'Role must be either user or admin'
            }
        },
        display_name: {
            type: 'VARCHAR(100)',
            nullable: true,
            validation: {
                maxLength: 100,
                message: 'Display name must not exceed 100 characters'
            }
        },
        bio: {
            type: 'TEXT',
            nullable: true,
            validation: {
                maxLength: 500,
                message: 'Bio must not exceed 500 characters'
            }
        },
        avatar_url: {
            type: 'TEXT',
            nullable: true
        },
        warnings: {
            type: 'INTEGER',
            default: 0,
            nullable: false,
            validation: {
                min: 0,
                message: 'Warnings must be non-negative'
            }
        },
        banned: {
            type: 'BOOLEAN',
            default: false,
            nullable: false
        },
        created_at: {
            type: 'TIMESTAMP',
            default: 'CURRENT_TIMESTAMP',
            nullable: false
        },
        updated_at: {
            type: 'TIMESTAMP',
            default: 'CURRENT_TIMESTAMP',
            nullable: false
        }
    },
    indexes: [
        { columns: ['username'], unique: true },
        { columns: ['email'], unique: true },
        { columns: ['role'] },
        { columns: ['created_at'] }
    ]
};

export default UserSchema;
