require('dotenv').config({ path: require('path').join(__dirname, '../apps/backend/.env') });
module.exports = require('../apps/backend/api/index.js');
