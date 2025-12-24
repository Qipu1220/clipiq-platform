/**
 * SystemSettings Model Schema
 * Defines the structure and validation rules for SystemSettings entity
 */

export const SystemSettingsSchema = {
    tableName: 'system_settings',
    columns: {
        id: {
            type: 'UUID',
            primaryKey: true,
            default: 'uuid_generate_v4()',
            nullable: false
        },
        key: {
            type: 'VARCHAR(100)',
            unique: true,
            nullable: false,
            validation: {
                pattern: /^[a-z0-9_]+$/,
                message: 'Key must contain only lowercase letters, numbers, and underscores'
            }
        },
        value: {
            type: 'TEXT',
            nullable: false
        },
        description: {
            type: 'TEXT',
            nullable: true,
            validation: {
                maxLength: 500,
                message: 'Description must not exceed 500 characters'
            }
        },
        data_type: {
            type: 'VARCHAR(20)',
            default: 'string',
            nullable: false,
            validation: {
                enum: ['string', 'number', 'boolean', 'json'],
                message: 'Data type must be one of: string, number, boolean, json'
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
        { columns: ['key'], unique: true }
    ]
};

// Common system settings keys
export const SYSTEM_SETTINGS_KEYS = {
    MAINTENANCE_MODE: 'maintenance_mode',
    MAINTENANCE_MESSAGE: 'maintenance_message',
    REGISTRATION_ENABLED: 'registration_enabled',
    MAX_UPLOAD_SIZE: 'max_upload_size',
    MAX_VIDEO_DURATION: 'max_video_duration'
};

export default SystemSettingsSchema;
