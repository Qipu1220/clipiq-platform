/**
 * SystemSettings Model
 * Repository for system settings data access operations
 */

import pool from '../config/database.js';

export class SystemSettings {
  /**
   * Get maintenance mode status
   * @returns {Promise<boolean>} True if maintenance mode is enabled
   */
  static async getMaintenanceMode() {
    const query = `
      SELECT value as maintenance_mode
      FROM system_settings
      WHERE key = 'maintenance_mode'
    `;
    const result = await pool.query(query);
    return result.rows[0]?.maintenance_mode === 'true';
  }

  /**
   * Update maintenance mode status
   * @param {boolean} enabled - True to enable, false to disable
   * @returns {Promise<boolean>} Updated maintenance mode status
   */
  static async updateMaintenanceMode(enabled) {
    const query = `
      UPDATE system_settings
      SET value = $1, updated_at = CURRENT_TIMESTAMP
      WHERE key = 'maintenance_mode'
      RETURNING value
    `;
    const result = await pool.query(query, [enabled.toString()]);
    return result.rows[0]?.value === 'true';
  }

  /**
   * Get service maintenance mode status
   * @returns {Promise<boolean>} True if service maintenance mode is enabled
   */
  static async getServiceMaintenanceMode() {
    const query = `
      SELECT value as service_maintenance_mode
      FROM system_settings
      WHERE key = 'service_maintenance_mode'
    `;
    const result = await pool.query(query);
    return result.rows[0]?.service_maintenance_mode === 'true';
  }

  /**
   * Update service maintenance mode status
   * @param {boolean} enabled - True to enable, false to disable
   * @returns {Promise<boolean>} Updated service maintenance mode status
   */
  static async updateServiceMaintenanceMode(enabled) {
    const query = `
      UPDATE system_settings
      SET value = $1, updated_at = CURRENT_TIMESTAMP
      WHERE key = 'service_maintenance_mode'
      RETURNING value
    `;
    const result = await pool.query(query, [enabled.toString()]);
    return result.rows[0]?.value === 'true';
  }

  /**
   * Get a single setting by key
   * @param {string} key - Setting key
   * @returns {Promise<string|null>} Setting value or null if not found
   */
  static async getSetting(key) {
    const query = `
      SELECT value
      FROM system_settings
      WHERE key = $1
    `;
    const result = await pool.query(query, [key]);
    return result.rows[0]?.value || null;
  }

  /**
   * Get multiple settings by keys
   * @param {Array<string>} keys - Array of setting keys
   * @returns {Promise<Object>} Object with key-value pairs
   */
  static async getSettings(keys) {
    if (!keys || keys.length === 0) {
      return {};
    }

    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
    const query = `
      SELECT key, value
      FROM system_settings
      WHERE key IN (${placeholders})
    `;
    const result = await pool.query(query, keys);
    
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    
    return settings;
  }

  /**
   * Update a single setting
   * @param {string} key - Setting key
   * @param {string} value - Setting value
   * @returns {Promise<boolean>} True if updated successfully
   */
  static async updateSetting(key, value) {
    const query = `
      UPDATE system_settings
      SET value = $1, updated_at = CURRENT_TIMESTAMP
      WHERE key = $2
      RETURNING key
    `;
    const result = await pool.query(query, [value, key]);
    return result.rows.length > 0;
  }

  /**
   * Update multiple settings
   * @param {Object} settings - Object with key-value pairs
   * @returns {Promise<boolean>} True if all updated successfully
   */
  static async updateSettings(settings) {
    if (!settings || Object.keys(settings).length === 0) {
      return false;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const [key, value] of Object.entries(settings)) {
        await client.query(
          `UPDATE system_settings
           SET value = $1, updated_at = CURRENT_TIMESTAMP
           WHERE key = $2`,
          [value.toString(), key]
        );
      }
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
