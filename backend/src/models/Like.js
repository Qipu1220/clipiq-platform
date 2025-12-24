/**
 * Like Model Schema
 * Defines the structure and validation rules for Like entity
 */

export const LikeSchema = {
    tableName: 'likes',
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
        video_id: {
            type: 'UUID',
            nullable: false,
            foreignKey: {
                table: 'videos',
                column: 'id',
                onDelete: 'CASCADE'
            }
        },
        created_at: {
            type: 'TIMESTAMP',
            default: 'CURRENT_TIMESTAMP',
            nullable: false
        }
    },
    indexes: [
        { columns: ['user_id', 'video_id'], unique: true },
        { columns: ['video_id'] },
        { columns: ['created_at'] }
    ]
};

export default LikeSchema;
