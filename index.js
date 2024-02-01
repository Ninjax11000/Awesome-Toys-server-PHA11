const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ol08zse.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyJWT=(req,res,next)=>{
  const authorization=req.headers.authorization;
  if(!authorization) return res.status(401).send({error: true, message: 'unauthorized access'});

  const token=authorization.split(' ')[1];
  // console.log(token);
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
    if(err) return res.status(401).send({error: true, message: 'unauthorized access'});
    req.decoded=decoded;
    next();
  })

}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
     await client.connect();

    const toysCollection = client.db("toyMarket").collection("toys");

    // const indexKeys= {name: 1, category:1};
    // const indexOptions={name: "nameCategory"};
    // const result= await toysCollection.createIndex(indexKeys,indexOptions);
    //jwt

    app.post('/jwt', (req,res)=>{
      const user=req.body;
      console.log(user);
      const token= jwt.sign(
        user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });

      res.send({token});
    })

    app.get("/allToys", async (req, res) => {
      console.log(req.query);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page-1)* limit;
      const result = await toysCollection.find().skip(skip).limit(limit).toArray();
      res.send(result);
    });

    app.get('/search/:text', async(req,res)=>{
      const searchText=req.params.text;
      const result= await toysCollection.find({
        $or:[
          { name: { $regex: searchText, $options:"i"}},
          { category:{$regex: searchText, $options:"i"}},
        ],
      }).toArray();
      res.send(result);
    })

    app.get("/totalProducts", async (req, res) => {
      const result = await toysCollection.estimatedDocumentCount();
      res.send({ totalCount: result });
    });

    app.get("/allToys/toy/:id", async (req, res) => {
      console.log(req.params.id);

      const toy = await toysCollection.findOne({
        _id: new ObjectId(req.params.id),
      });

      res.send(toy);
    });
    

    app.get("/allToys/:category", async (req, res) => {
      const category = req.params.category;
      console.log(category);
      const result = await toysCollection
        .find({ category: category })
        .toArray();

      res.send(result);
    });

    app.get('/myToys/:email',verifyJWT, async(req,res)=>{
      const decoded=req.decoded.loggedUser;
      const email=req.params.email;
      console.log(email, decoded);
      if(decoded.email!== email) return res.status(403).send({error: true, message: 'forbidden access'});
      // console.log(req.headers.authorization);
      const result = await toysCollection
        .find({"seller.email": email})
        .toArray();
      res.send(result);

    } )

    app.post('/addToy', async(req,res)=>{
      const toyData=req.body;
      const result = await toysCollection.insertOne(toyData);
      res.send(result);
    })

    app.delete('/allToys/:id',async(req,res)=>{
      const id=req.params.id;
      const query = { _id: new ObjectId(id) };
      const result= await toysCollection.deleteOne(query);
      res.send(result);
    })

    app.put('/allToys/:id', async(req,res)=>{
      const id=req.params.id;
      const updateData=req.body;
      console.log(updateData);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
         ...updateData
        },
      };
      const result = await toysCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is running!");
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
