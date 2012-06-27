var fitbit_js = require('fitbit-js');

module.exports = function(consumerKey, consumerSecret) {

  var client = fitbit_js(consumerKey, consumerSecret);

  return { 

    ensureAuthenticated: function(req, res, callback) {
      if (!!req.session.token_fitbit)
        return callback(null, req.session.token_fitbit);

      client.getAccessToken(req, res, function (error, newToken) {
        if (error) {
          console.log("rgh, error", error)
          callback(new Error("Fitbit authentication failed!"))
        } else {
          console.log("got newToken", newToken)
          req.session.token_fitbit = newToken;
          callback(null, req.session.token_fitbit);
        }
      })
    },

    get: function(path, token, callback) {
      client.apiCall('GET', path,
        { 
          token: { 
            oauth_token_secret: token.oauth_token_secret, 
            oauth_token: token.oauth_token
          }
        },
        function(err, resp) {
            if (err) {
              callback(new Error("Failure connecting to FitBit:" + err.message), null)
            } else {  
              callback(null, resp);
            }
        }
      )
    },

    logout:  function(req) {
      req.session.token_fitbit = null;
    }
  }


}


