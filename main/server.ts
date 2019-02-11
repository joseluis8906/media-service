import bluebird from "bluebird";
import express from "express";
import fileUpload from "express-fileupload";
import fs from "fs";
import lodash from "lodash";
import Log from "loglevel";
import moment from "moment-timezone";
import mongoose from "mongoose";
import * as redis from "redis";
import { FileSchema } from "./fileSchema";

const app = express();
const port = 9090;
const redisAsync: any = bluebird.promisifyAll(redis);
const redisClient = redisAsync.createClient({host: `redis-${process.env.DATABASE}`});
Log.enableAll();
app.use(fileUpload({
  limits: {
    fileSize: 64 * 1024 * 1024,
    files: 1,
  },
}));

mongoose.Promise = global.Promise;
mongoose.set("useCreateIndex", true);
mongoose.connect(`mongodb://mongo-${process.env.DATABASE}/${process.env.DATABASE}`, {useNewUrlParser: true});

const FileModel = new FileSchema().getModelForClass(FileSchema);

app.use("/files", express.static("files"));

app.post("/upload", async (req, res) => {
  if (req.get("x-access-key") !== `${process.env.KEY}`) {
    return await res.status(401).send("Wrog key or not suplied.");
  }
  if (!fs.existsSync("/app/files")) {
    fs.mkdirSync("/app/files");
  }
  try {
    if (lodash.values(req.files).length > 1) {
      return await res.send("Error maximum number of files.");
    }
    const key = moment().tz("America/Bogota").format("YYYYMMDD").toString();
    if (!(await redisClient.getAsync(key))) {
      await redisClient.set(key, Number(key + "0000").toString());
    }
    const next = Number(await redisClient.getAsync(key)) + 1;
    redisClient.set(key, next.toString());
    const file: any = req.files!.file;
    const ext = file.name.split(".")[file.name.split(".").length - 1];
    await file.mv(`/app/files/${next.toString()}.${ext}`);

    const fileDb = new FileModel({
      mimeType: file.mimetype,
      name: `${next.toString()}.${ext}`,
    });
    await fileDb.save();
    return await res.send("uploaded.");

  } catch (err) {
    return await res.send("Error processing file. " + err.message);
  }
});

app.get("/", async (_, res) => {
  return await res.send("media service");
});

app.get("/find", async (req, res) => {
  if (req.get("x-access-key") !== `${process.env.KEY}`) {
    return await res.status(401).send("Wrog key or not suplied.");
  }
  return await res.json(await FileModel.find({}, {name: 1, _id: 0}));
});

app.use(express.static("files"));
app.listen(port, () => Log.info(`Example app listening on port ${port}!`));
