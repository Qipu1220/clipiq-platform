/**
 * Appeal Model Schema
 * Defines the structure and validation rules for Appeal entity
 */

export const AppealSchema = {
    tableName: 'appeals',
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
        appeal_type: {
            type: 'VARCHAR(50)',
            nullable: false,
            validation: {
                enum: ['ban_appeal', 'warning_appeal', 'video_removal_appeal'],
                message: 'Appeal type must be one of: ban_appeal, warning_appeal, video_removal_appeal'
            }
        },
        reason: {
            type: 'TEXT',
            nullable: false,
            validation: {
                minLength: 10,
                maxLength: 2000,
                message: 'Reason must be between 10 and 2000 characters'
            }
        },
        status: {
            type: 'VARCHAR(20)',
            default: 'pending',
            nullable: false,
            validation: {
                enum: ['pending', 'approved', 'rejected'],
                message: 'Status must be one of: pending, approved, rejected'
            }
        },
        admin_response: {
            type: 'TEXT',
            nullable: true,
            validation: {
                maxLength: 2000,
                message: 'Admin response must not exceed 2000 characters'
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
        { columns: ['user_id'] },
        { columns: ['status'] },
        { columns: ['appeal_type'] },
        { columns: ['created_at'] }
    ]
};

export default AppealSchema;
