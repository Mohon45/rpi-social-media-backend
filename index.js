const express = require("express");
const app = express();

const cors = require("cors");
require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const ObjectId = require("mongodb").ObjectId;
const { MongoClient, ServerApiVersion } = require("mongodb");
const path = require("path");
const multer = require("multer");
const cloudinary = require("./utilits/cloudinary");
// const upload = require("./utilits/multer");

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.m0coh.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// file upload code start
const UPLOADS_FOLDER = "./uploads/";

//define the storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_FOLDER);
  },
  filename: (req, file, cb) => {
    const fileExt = path.extname(file.originalname);
    const fileName =
      file.originalname
        .replace(fileExt, "")
        .toLocaleLowerCase()
        .split(" ")
        .join("-") +
      "-" +
      Date.now();
    cb(null, fileName + fileExt);
  },
});

// preapre the final multer upload object
let upload = multer({
  storage: storage,
  limits: {
    fileSize: 2000000, // 2mb
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "avatar") {
      if (
        file.mimetype === "image/png" ||
        file.mimetype === "image/jpg" ||
        file.mimetype === "image/jpeg"
      ) {
        cb(null, true);
      } else {
        cb(new Error("Only .jpg, .png or .jpeg format allowed"));
      }
    } else {
      cb(new Error("There was an unknown error"));
    }
  },
});
// file upload code end

async function run() {
  try {
    await client.connect();
    const database = client.db("social-media");
    const usersCollection = database.collection("users");
    const postCollection = database.collection("posts");

    app.post("/api/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.json(result);
    });

    // create post
    app.post(
      "/api/new-post",
      upload.fields([{ name: "avatar", maxCount: 1 }]),
      async (req, res) => {
        try {
          // Upload image to cloudinary
          // const uploadResult = await cloudinary.uploader.upload(req.file.path);

          const newPost = {
            description: req.body.description,
            // image: uploadResult.secure_url,
            postDate: new Date(),
            name: req.body.name,
            // cloudinary_id: uploadResult.public_id,
          };

          const result = await postCollection.insertOne(newPost);
          console.log(result);
          res.send(result);
        } catch (err) {
          console.log(err);
        }
      }
    );

    // get all post
    app.get("/api/all-post", async (req, res) => {
      const query = {};
      const cursor = postCollection.find(query);
      const posts = await cursor.toArray();
      res.send(posts);
    });

    // // get single bill
    app.get("/api/single-post/:id", async (req, res) => {
      const result = await postCollection
        .find({ _id: ObjectId(req.params.id) })
        .toArray();
      res.send(result[0]);
    });

    // update
    app.put("/api/single-post/:id", async (req, res) => {
      const id = req.params.id;
      const updatePost = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          fullName: updatePost.fullName,
          email: updatePost.email,
          phone: updatePost.phone,
          paidAmount: updatePost.paidAmount,
        },
      };
      const result = await postCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    //delete bill
    app.delete("/api/single-post/:id", async (req, res) => {
      const result = await postCollection.deleteOne({
        _id: ObjectId(req.params.id),
      });
      res.send(result);
    });
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello Rpi Students!");
});

app.listen(port, () => {
  console.log(`listening at ${port}`);
});
