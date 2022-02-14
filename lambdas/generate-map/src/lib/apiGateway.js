module.exports = {
  Success: (payload = null) => ({
    statusCode: 200,
    body: payload && JSON.stringify(payload),
  }),
  BadRequest: (message) => ({
    statusCode: 400,
    body: JSON.stringify({ message }),
  }),
  Error: (message) => ({
    statusCode: 500,
    body: JSON.stringify({ message }),
  }),
};
