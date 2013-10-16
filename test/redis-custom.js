/**
 * Parse url connection configuration
 */
function parseRedisUrl(url) {
  if (!url)
    url = 'redis://127.0.0.1:6379/0';

  var urlParsed = require('url').parse(url);

  var config = {
    database: (urlParsed.pathname) ? urlParsed.pathname.split('/')[1] : 0,
    port: urlParsed.port,
    host: urlParsed.hostname,
    options: {}
  };

  if (urlParsed.auth)
    config.password = urlParsed.auth.split(':')[1];

  return config;
}

// Exports parseRedisUrl
module.exports.parseRedisUrl = parseRedisUrl;

/**
 * Overide createClient to use config
 */
function createClient(url) {
  var redis = require('redis'),
      config = parseRedisUrl(url);

  var client = redis.createClient(config.port, config.host, config.options);
  client.select(config.database);

  if (config.password)
    client.auth(config.password);

  return client;
}

// Exports createClient
module.exports.createClient = createClient;
