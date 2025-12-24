/**
 * VideoReport Model Schema
 * Defines the structure and validation rules for VideoReport entity
 */

export const VideoReportSchema = {
    tableName: 'video_reports',
    columns: {
        id: {
            type: 'UUID',
            primaryKey: true,
            default: 'uuid_generate_v4()',
            nullable: false
        },
        video_id: {
            type: 'UUID',
            nullable: false,
            foreignKey: {
                table: 'videos',
                column: 'id',
                onDelete: 'CASCADE'
            }
        },
        reporter_id: {
            type: 'UUID',
            nullable: false,
            foreignKey: {
                table: 'users',
                column: 'id',
                onDelete: 'CASCADE'
            }
        },
        reason: {
            type: 'VARCHAR(100)',
            nullable: false,
            validation: {
                enum: ['spam', 'violence', 'nudity', 'hate_speech', 'copyright', 'misleading', 'other'],
                message: 'Reason must be one of: spam, violence, nudity, hate_speech, copyright, misleading, other'
            }
        },
        description: {
            type: 'TEXT',
            nullable: true,
            validation: {
                maxLength: 1000,
                message: 'Description must not exceed 1000 characters'
            }
        },
        status: {
            type: 'VARCHAR(20)',
            default: 'pending',
            nullable: false,
            validation: {
                enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
                message: 'Status must be one of: pending, reviewed, resolved, dismissed'
            }
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
        { columns: ['video_id'] },
        { columns: ['reporter_id'] },
        { columns: ['status'] },
        { columns: ['created_at'] }
    ]
};

export default VideoReportSchema;
