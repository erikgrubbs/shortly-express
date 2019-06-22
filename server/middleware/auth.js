const models = require("../models");
const Promise = require("bluebird");

module.exports.createSession = (req, res, next) => {
  var cookieCheck = Object.keys(req.cookies).length > 0;
  if (cookieCheck) {
    return models.Sessions.get({ hash: req.cookies.shortlyid })
      .then(session => {
        req.session = session;
      })
      .then(() => {
        next();
      })
      .catch(err => {
        return models.Sessions.create()
          .then(result => {
            return models.Sessions.get({ id: result.insertId });
          })
          .then(ses => {
            req.session = ses;
            res.cookie("shortlyid", ses.hash);
          })
          .then(() => {
            next();
          });
      });
  }
  if (!cookieCheck) {
    return models.Sessions.create()
      .then(result => {
        return models.Sessions.get({ id: result.insertId });
      })
      .then(ses => {
        req.session = ses;
        res.cookie("shortlyid", ses.hash);
      })
      .then(() => {
        next();
      });
  }
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/
