const express = require("express");
const path = require("path");
const utils = require("./lib/hashUtils");
const partials = require("express-partials");
const bodyParser = require("body-parser");
const Auth = require("./middleware/auth");
const models = require("./models");
const createSession = require("./middleware/auth");
const cookieParse = require("./middleware/cookieParser");

const app = express();

app.set("views", `${__dirname}/views`);
app.set("view engine", "ejs");
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));
app.use(cookieParse);
app.use(Auth.createSession);
app.get("/", (req, res) => {
  // check if it has a cookie
  res.render("index");
});

app.get("/create", (req, res) => {
  res.render("index");
});

app.get("/links", (req, res, next) => {
  models.Links.getAll()
    .then(links => {
      res.status(200).send(links);
    })
    .error(error => {
      res.status(500).send(error);
    });
});

app.post("/links", (req, res, next) => {
  var url = req.body.url;
  if (!models.Links.isValidUrl(url)) {
    // send back a 404 if link is not valid
    return res.sendStatus(404);
  }

  return models.Links.get({ url })
    .then(link => {
      if (link) {
        throw link;
      }
      return models.Links.getUrlTitle(url);
    })
    .then(title => {
      return models.Links.create({
        url: url,
        title: title,
        baseUrl: req.headers.origin
      });
    })
    .then(results => {
      return models.Links.get({ id: results.insertId });
    })
    .then(link => {
      throw link;
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(link => {
      res.status(200).send(link);
    });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.get("/logout", (req, res) => {
  return models.Sessions.delete({ id: req.session.id }).then(() => {
    res.clearCookie("shortlyid", { value: req.session.hash });
    res.status(200);
    res.redirect("/login");
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  return models.Users.get({ username })
    .then(user => {
      if (models.Users.compare(password, user.password, user.salt)) {
        models.Sessions.update({ id: req.session.id }, { userId: user.id });
        res.status(200);
        res.redirect("/");
      } else {
        res.status(400);
        res.redirect("/login");
      }
    })
    .catch(err => {
      res.status(404);
      res.redirect("/login");
    });

  // models.Sessions.create();
});

app.post("/signup", (req, res) => {
  // parse the request
  var { username, password } = req.body;
  return models.Users.create({ username, password })
    .then(result => {
      res.status(201);
      models.Sessions.update(
        { id: req.session.id },
        { userId: result.insertId }
      );
      res.redirect("/");
    })
    .catch(err => {
      res.status(400);
      console.error("error signing up");
      res.redirect("/signup");
    });
  // models.Sessions.create();
});

/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get("/:code", (req, res, next) => {
  return models.Links.get({ code: req.params.code })
    .tap(link => {
      if (!link) {
        throw new Error("Link does not exist");
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect("/");
    });
});

module.exports = app;
