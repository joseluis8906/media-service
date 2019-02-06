
var fs = require('fs');
const express = require("express");
const fileUpload = require('express-fileupload');
const moment = require("moment-timezone");
const app = express();
const port = 9090;

app.use(fileUpload({
  limits: { 
    files: 1,
    fileSize: 64 * 1024 * 1024,
  },
}));

const secs = new Map();

app.post("/upload", async (req, res) => {
  if (req.get("x-access-key") !== "MAJE@O93I2G5#XX074*!") {
    return await res.status(401).send("Wrog key or not suplied.");
  }
  if (!fs.existsSync("/app/files")){
    fs.mkdirSync("/app/files");
  }
  try {
    if (Object.values(req.files).length > 1){
      return await res.send("Error maximum number of files.");
    }
    const key = moment().tz("America/Bogota").format("YYYYMMDD");
    if (!secs.get(key)) {
      secs.set(key, Number(key + "0000"));
    } 
    const next = secs.get(key) + 1;
    secs.set(key, next);
    const listFileName = req.files.file.name.split(".");
    await req.files.file.mv(`/app/files/${next.toString()}.${listFileName[listFileName.length - 1]}`);
    await res.send("uploaded.");
  } catch (err) {
    await res.send("Error processing file. " + err.message);
  }
});

app.use(express.static("files"));

app.listen(port, () => console.log(`Example app listening on port ${port}!`));