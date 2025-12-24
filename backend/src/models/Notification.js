/**
 * Notification Model Schema
 * Defines the structure and validation rules for Notification entity
 */

export const NotificationSchema = {
    tableName: 'notifications',
    columns: {
        id: {
            type: 'UUID',
            primaryKey: true,
            default: 'uuid_generate_v4()',
            nullable: false
        },
        user_id: {
            type: 'UUID',
            nullable: false,
            foreignKey: {
                table: 'users',
                column: 'id',
                onDelete: 'CASCADE'
            }
        },
        type: {
            type: 'VARCHAR(50)',
            nullable: false,
            validation: {
                enum: ['like', 'comment', 'subscription', 'video_upload', 'system'],
                message: 'Type must be one of: like, comment, subscription, video_upload, system'
            }
        },
        message: {
            type: 'TEXT',
            nullable: false,
            validation: {
                maxLength: 500,
                message: 'Message must not exceed 500 characters'
            }
        },
        related_id: {
            type: 'UUID',
            nullable: true
        },
        read: {
            type: 'BOOLEAN',
            default: false,
            nullable: false
        },
        created_at: {
            type: 'TIMESTAMP',
            default: 'CURRENT_TIMESTAMP',
            nullable: false
        }
    },
    indexes: [
        { columns: ['user_id'] },
        { columns: ['type'] },
        { columns: ['read'] },
        { columns: ['created_at'] }
    ]
};

export default NotificationSchema;
