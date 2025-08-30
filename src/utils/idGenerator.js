/**
 * DHIS2 UID Generator
 * Generates valid DHIS2 UIDs (11 characters, alphanumeric, first char must be letter)
 */

const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

/**
 * Generate a valid DHIS2 UID
 * @returns {string} 11-character UID starting with a letter
 */
export function generateUID() {
    let uid = ''
    
    // First character must be a letter
    uid += LETTERS.charAt(Math.floor(Math.random() * LETTERS.length))
    
    // Remaining 10 characters can be letters or numbers
    for (let i = 1; i < 11; i++) {
        uid += CHARS.charAt(Math.floor(Math.random() * CHARS.length))
    }
    
    return uid
}

/**
 * Generate multiple UIDs
 * @param {number} count Number of UIDs to generate
 * @returns {string[]} Array of UIDs
 */
export function generateUIDs(count) {
    const uids = []
    for (let i = 0; i < count; i++) {
        uids.push(generateUID())
    }
    return uids
}

/**
 * Validate if a string is a valid DHIS2 UID
 * @param {string} uid The UID to validate
 * @returns {boolean} True if valid UID
 */
export function isValidUID(uid) {
    if (!uid || typeof uid !== 'string' || uid.length !== 11) {
        return false
    }
    
    // First character must be a letter
    if (!/^[a-zA-Z]/.test(uid)) {
        return false
    }
    
    // All characters must be alphanumeric
    if (!/^[a-zA-Z0-9]+$/.test(uid)) {
        return false
    }
    
    return true
}

export default { generateUID, generateUIDs, isValidUID }