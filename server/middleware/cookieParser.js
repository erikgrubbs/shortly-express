const parseCookies = (req, res, next) => {
  var cookies = {};
  if (req.headers.cookie) {
    var cookieArray = req.headers.cookie.split("; ");
    cookieArray
      .map(cookie => {
        return cookie.split("=");
      })
      .forEach(pair => {
        cookies[pair[0]] = pair[1];
      });
  }
  
  req.cookies = cookies;
  next();
};

module.exports = parseCookies;
