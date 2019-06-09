import bluebird from "bluebird";
import cors from "cors";
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import fileUpload from "express-fileupload";
import fs from "fs";
import lodash from "lodash";
import Log from "loglevel";
import moment from "moment-timezone";
import mongoose from "mongoose";
import * as redis from "redis";
import { FileSchema } from "./fileSchema";

const app = express();
app.use(bodyParser.json());
//app.use(cors({}));

const port = 9090;
const redisAsync: any = bluebird.promisifyAll(redis);
const redisClient = redisAsync.createClient({host: `${process.env.REDIS_HOST}`});
Log.enableAll();
app.use(fileUpload({
  limits: {
    fileSize: 64 * 1024 * 1024,
    files: 1,
  },
}));

mongoose.Promise = global.Promise;
mongoose.set("useCreateIndex", true);
mongoose.connect(`mongodb://${process.env.MONGO_HOST}/${process.env.MONGO_DB}`, {useNewUrlParser: true});

const FileModel = new FileSchema().getModelForClass(FileSchema);

/*app.use((_: Request, res: Response, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-access-key");
  next();
});*/

app.post("/media", async (req: Request, res: Response) => {
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
    return await res.set("Content-Type", "text/plain").send(`${next.toString()}.${ext}`);

  } catch (err) {
    return await res.set("Content-Type", "text/plain").send("Error processing file. " + err.message);
  }
});

app.get("/media", async (req: Request, res: Response) => {
  if (req.get("x-access-key") !== `${process.env.KEY}`) {
    return await res.status(401).send("Wrog key or not suplied.");
  }
  return await res.json(await FileModel.find({}, {name: 1, _id: 0}));
});

app.delete("/media", async (req: Request, res: Response) => {
  if (req.get("x-access-key") !== `${process.env.KEY}`) {
    return await res.status(401).send("Wrog key or not suplied.");
  }
  if (fs.existsSync(`/app/files/${req.body.file}`)) {
    await fs.unlinkSync(`/app/files/${req.body.file}`);
    await FileModel.findOneAndRemove({name: `${req.body.file}`});
    return res.set("Content-Type", "text/plain").send(`${req.body.file} Deleted`);
  } else {
    return res.set("Content-Type", "text/plain").status(404).send("File not found");
  }
});

app.listen(port, () => Log.info(`Example app listening on port ${port}!`));
