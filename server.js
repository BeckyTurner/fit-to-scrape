// dependencies
var express = require("express");
var mongoose = require("mongoose");
var request = require("request");
var cheerio = require("cheerio");
var bodyParser = require("body-parser");
var exphbs = require("express-handlebars");

var PORT = process.env.PORT || 3000;

var app = express();

app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json({
  type: "application/json"
}));

app.use(express.static("public"));

var databaseUrl = "news";
mongoose.Promise = Promise;
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/" + databaseUrl;
mongoose.connect(MONGODB_URI);

app.engine("handlebars", exphbs({
  defaultLayout: "main"
}));
app.set("view engine", "handlebars");

var db = require("./models");

app.get("/", function (req, res) {

  db.Article.find({
    saved: false
  },

    function (error, dbArticle) {
      if (error) {
        console.log(error);
      } else {
        res.render("index", {
          articles: dbArticle
        });
      }
    })
})

// get links from craigslist
app.get("/scrape", function (req, res) {
  request("https://stcloud.craigslist.org/d/childcare/search/kid", function (error, response, html) {

    var $ = cheerio.load(html);
    $(".result-info").each(function (i, element) {

      var title = $(element).find(".result-title").text().trim();
      var link = $(element).find(".result-title").attr("href");

      // if title and link are available, scrape the link
      if (title && link) {
        db.Article.create({
          title: title,
          link: link,
        },
          function (err, res) {
            if (err) {
              console.log(err);
            } else {
              console.log(res);
            }
          });
        // if there are 10 articles, then return the callback to the frontend
        console.log(i);
        if (i === 10) {
          return res.sendStatus(200);
        }
      }
    });
  });
});

// route for retrieving all the saved articles
app.get("/saved", function (req, res) {
  db.Article.find({
    saved: true
  })
    .then(function (dbArticle) {
      res.render("saved", {
        articles: dbArticle
      })
    })
    .catch(function (err) {
      res.json(err);
    })

});

//saving link
app.put("/saved/:id", function (req, res) {
  db.Article.findByIdAndUpdate(
    req.params.id, {
      $set: req.body
    }, {
      new: true
    })
    .then(function (dbArticle) {
      res.render("saved", {
        articles: dbArticle
      })
    })
    .catch(function (err) {
      res.json(err);
    });
});

// saving a new note
app.post("/submit/:id", function (req, res) {
  db.Note.create(req.body)
    .then(function (dbNote) {
      var articleIdFromString = mongoose.Types.ObjectId(req.params.id)
      return db.Article.findByIdAndUpdate(articleIdFromString, {
        $push: {
          notes: dbNote._id
        }
      })
    })
    .then(function (dbArticle) {
      res.json(dbNote);
    })
    .catch(function (err) {
      res.json(err);
    });
});

//find a note by ID
app.get("/notes/article/:id", function (req, res) {
  db.Article.findOne({ "_id": req.params.id })
    .populate("notes")
    .exec(function (error, data) {
      if (error) {
        console.log(error);
      } else {
        res.json(data);
      }
    });
});


app.get("/notes/:id", function (req, res) {

  db.Note.findOneAndRemove({ _id: req.params.id }, function (error, data) {
    if (error) {
      console.log(error);
    } else {
    }
    res.json(data);
  });
});

// listen for the routes
app.listen(PORT, function () {
  console.log("App is running on port " + PORT);
});