/**
 * Video Model Schema
 * Defines the structure and validation rules for Video entity
 */

export const VideoSchema = {
    tableName: 'videos',
    columns: {
        id: {
            type: 'UUID',
            primaryKey: true,
            default: 'uuid_generate_v4()',
            nullable: false
        },
        title: {
            type: 'VARCHAR(255)',
            nullable: false,
            validation: {
                minLength: 1,
                maxLength: 255,
                message: 'Title must be between 1 and 255 characters'
            }
        },
        description: {
            type: 'TEXT',
            nullable: true,
            validation: {
                maxLength: 5000,
                message: 'Description must not exceed 5000 characters'
            }
        },
        uploader_id: {
            type: 'UUID',
            nullable: false,
            foreignKey: {
                table: 'users',
                column: 'id',
                onDelete: 'CASCADE'
            }
        },
        thumbnail_url: {
            type: 'TEXT',
            nullable: true
        },
        video_url: {
            type: 'TEXT',
            nullable: false
        },
        duration: {
            type: 'INTEGER',
            nullable: true,
            validation: {
                min: 0,
                message: 'Duration must be non-negative'
            }
        },
        views: {
            type: 'INTEGER',
            default: 0,
            nullable: false,
            validation: {
                min: 0,
                message: 'Views must be non-negative'
            }
        },
        status: {
            type: 'VARCHAR(20)',
            default: 'active',
            nullable: false,
            validation: {
                enum: ['active', 'processing', 'deleted', 'banned'],
                message: 'Status must be one of: active, processing, deleted, banned'
            }
        },
        upload_date: {
            type: 'TIMESTAMP',
            default: 'CURRENT_TIMESTAMP',
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
        { columns: ['uploader_id'] },
        { columns: ['status'] },
        { columns: ['upload_date'] },
        { columns: ['views'] },
        { columns: ['created_at'] }
    ]
};

export default VideoSchema;
