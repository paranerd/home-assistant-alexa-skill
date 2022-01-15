const axios = require('axios');

/**
 * Convert parameter object into query string.
 *
 * @param {Object} params
 * @returns {string}
 */
function paramsToQueryString(params) {
  return Object.keys(params).map(key => key + '=' + params[key]).join('&');
}

/**
 * Perform GET request.
 *
 * @param {string} url
 * @param {string} path
 * @param {Object} params
 * @param {Object} headers
 * @returns {Object}
 */
async function get(url, path, params = {}, headers = {}) {
    const queryString = paramsToQueryString(params);
    const res = await axios.get(url + '/' + path + '?' + queryString, {headers: headers});

    return res.data;
}

/**
 * Perform POST request.
 *
 * @param {string} url
 * @param {string} path
 * @param {Object} params
 * @param {Object} headers
 * @returns {Object}
 */
async function post(url, path, params = {}, headers = {}) {
    const res = await axios.post(url + '/' + path, params, {headers: headers});

    return res.data;
}

module.exports = {
  get: get,
  post: post,
};
