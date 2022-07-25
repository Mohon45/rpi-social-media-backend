const express = require("express");
const app = express();

const cors = require("cors");
require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const ObjectId = require("mongodb").ObjectId;
const { MongoClient, ServerApiVersion } = require("mongodb");

const port = process.env.PORT || 5001;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.m0coh.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

//jwt authentication token
const generateJWTToken = (user) => {
  return jwt.sign(user, process.env.JWT_SECRET_KEY, { expiresIn: "500s" });
};

const verifyJWTToken = (req, res, next) => {
  try {
    const { authorization } = req.headers;
    const decoded = jwt.verify(authorization, process.env.JWT_SECRET_KEY);
    req.decodedEmail = decoded.email;
    next();
  } catch {}
};

async function run() {
  try {
    await client.connect();
    const database = client.db("social-media");
    const usersCollection = database.collection("users");
    const postCollection = database.collection("posts");

    //register
    app.post("/api/registration", async (req, res) => {
      const hashedPass = await bcrypt.hash(req.body.password, 10);
      const newUser = {
        displayName: req.body.name,
        password: hashedPass,
        email: req.body.email,
      };
      const result = await usersCollection.insertOne(newUser);
      res.json(result);
    });

    //login
    app.post("/api/login", async (req, res) => {
      const userInfo = req.body;
      const newUser = {
        email: userInfo.email,
        password: "jwttoken",
      };
      const token = generateJWTToken(newUser);
      const query = { email: userInfo.email };
      const user = await usersCollection.findOne(query);

      const matchedUser = {
        displayName: user.displayName,
        email: user.email,
      };
      console.log("match", matchedUser);

      const passValidate = await bcrypt.compare(
        userInfo.password,
        user.password
      );

      if (passValidate) {
        console.log("password is correct");
        res.json({ token: token, status: "login", user: matchedUser });
      } else {
        console.log("password is incorrect");
        res.json({ status: "notlogin" });
      }
    });

    // create post
    app.post("/api/new-post", async (req, res) => {
      const newPost = req.body;
      const result = await postCollection.insertOne(newPost);
      res.send(result);
    });

    // get all billings
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
