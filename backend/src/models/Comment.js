/**
 * Comment Model Schema
 * Defines the structure and validation rules for Comment entity
 */

export const CommentSchema = {
    tableName: 'comments',
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
        user_id: {
            type: 'UUID',
            nullable: false,
            foreignKey: {
                table: 'users',
                column: 'id',
                onDelete: 'CASCADE'
            }
        },
        text: {
            type: 'TEXT',
            nullable: false,
            validation: {
                minLength: 1,
                maxLength: 2000,
                message: 'Comment must be between 1 and 2000 characters'
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
        { columns: ['user_id'] },
        { columns: ['created_at'] }
    ]
};

export default CommentSchema;
