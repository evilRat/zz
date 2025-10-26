/**
 * Decimal utility functions to handle floating-point precision issues
 */

/**
 * Add two numbers with precision handling
 * @param {number} a - First number
 * @param {number} b - Second number
 * @param {number} precision - Decimal precision (default: 2)
 * @returns {number} Sum with specified precision
 */
function add(a, b, precision = 2) {
  const factor = Math.pow(10, precision);
  return Math.round((a + b) * factor) / factor;
}

/**
 * Subtract two numbers with precision handling
 * @param {number} a - First number
 * @param {number} b - Second number
 * @param {number} precision - Decimal precision (default: 2)
 * @returns {number} Difference with specified precision
 */
function subtract(a, b, precision = 2) {
  const factor = Math.pow(10, precision);
  return Math.round((a - b) * factor) / factor;
}

/**
 * Multiply two numbers with precision handling
 * @param {number} a - First number
 * @param {number} b - Second number
 * @param {number} precision - Decimal precision (default: 2)
 * @returns {number} Product with specified precision
 */
function multiply(a, b, precision = 2) {
  const factor = Math.pow(10, precision);
  return Math.round(a * b * factor) / factor;
}

/**
 * Divide two numbers with precision handling
 * @param {number} a - First number
 * @param {number} b - Second number
 * @param {number} precision - Decimal precision (default: 2)
 * @returns {number} Quotient with specified precision
 */
function divide(a, b, precision = 2) {
  const factor = Math.pow(10, precision);
  return Math.round((a / b) * factor) / factor;
}

/**
 * Round a number to specified precision
 * @param {number} num - Number to round
 * @param {number} precision - Decimal precision (default: 2)
 * @returns {number} Rounded number
 */
function round(num, precision = 2) {
  const factor = Math.pow(10, precision);
  return Math.round(num * factor) / factor;
}

module.exports = {
  add,
  subtract,
  multiply,
  divide,
  round
};