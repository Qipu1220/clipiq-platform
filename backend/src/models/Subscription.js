/**
 * Subscription Model Schema
 * Defines the structure and validation rules for Subscription entity
 */

export const SubscriptionSchema = {
    tableName: 'subscriptions',
    columns: {
        id: {
            type: 'UUID',
            primaryKey: true,
            default: 'uuid_generate_v4()',
            nullable: false
        },
        subscriber_id: {
            type: 'UUID',
            nullable: false,
            foreignKey: {
                table: 'users',
                column: 'id',
                onDelete: 'CASCADE'
            }
        },
        subscribee_id: {
            type: 'UUID',
            nullable: false,
            foreignKey: {
                table: 'users',
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
        { columns: ['subscriber_id', 'subscribee_id'], unique: true },
        { columns: ['subscribee_id'] },
        { columns: ['created_at'] }
    ],
    constraints: [
        {
            type: 'CHECK',
            condition: 'subscriber_id != subscribee_id',
            message: 'User cannot subscribe to themselves'
        }
    ]
};

export default SubscriptionSchema;
