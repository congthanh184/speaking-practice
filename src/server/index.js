const express = require('express');
const os = require('os');
const bodyParser = require('body-parser');

const app = express();

app.use(express.static('dist'));
app.use(express.static('public'));
app.use(bodyParser());
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(
  bodyParser.urlencoded({
    // to support URL-encoded bodies
    extended: true
  })
);
app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded()); // to support URL-encoded bodies

app.post('/api/stt', (req, res) => {
  console.log(req);
  debugger
  res.send({ username: os.userInfo().username });
});

app.listen(process.env.PORT || 8080, () => console.log(`Listening on port ${process.env.PORT || 8080}!`));
