const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
//middleware
app.use(cors());
app.use(express.json());


//mongoDB


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vw1cwl2.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
    useNewUrlParser : true,
    useUnifiedTopology : true,
    maxPoolSize : 10,
});


const verifyJWT = (req,res,next)=>{
    
    const authorization = req.headers.authorization;
    if(!authorization){
        return res.status(401).send({error : true, message : 'Unauthorized access'})
    }
    const token = authorization.split(' ')[1];
    console.log(token);
    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET, (error,decoded)=>{
        if(error){
            return res.status(401).send({error : true, message : 'Unauthorized access'})
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        client.connect((err)=>{
            if(err){
                console.error(err);
                return;
            }
        });

        const serviceCollection = client.db('carDoctor').collection('services');
        const bookingCollection = client.db('carDoctor').collection('bookings');
        // jwt
        app.post('/jwt',async(req,res)=>{
            const user = req.body;
            const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{
                expiresIn : '1hr'
            });
            res.send({token});
        })

        //services route
        app.get('/services', async (req, res) => {
            const cursor = serviceCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id:
                    new ObjectId(id)
            }
            const options = {
                projection: { title: 1, price: 1, service_id: 1,img :1 }
            }
            const result = await serviceCollection.findOne(query, options);
            res.send(result);
        })

        //bookings
        app.get('/bookings',verifyJWT, async(req,res)=>{
            // console.log(req.headers.authorization);
            const decoded = req.decoded;
            if(decoded.email !== req.query.email){
                return res.status(403).send({error : true, message : 'Forbidden access'})
            }
            let query = {};
            if(req.query?.email){
                query = {email : req.query.email}
            }
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        })


        app.post('/bookings',async(req,res)=>{
            const booking  = req.body;
            console.log(booking);
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        })

        app.patch('/bookings/:id',async(req, res)=>{
            const id = req.params.id;
            const filter = {_id : new ObjectId(id)};
            const updatedBooking = req.body;
            const updatedDoc = {
                $set : {
                    status : updatedBooking.status
                }
            }
            const result = await bookingCollection.updateOne(filter,updatedDoc);
            res.send(result);
        })

        app.delete('/bookings/:id',async(req, res)=>{
            const id = req.params.id;
            const query = {_id :  new ObjectId (id)};
            const result = await bookingCollection.deleteOne(query);
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error

    }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send("Car doctor server running")
})

app.listen(port, () => {
    console.log(`Car Doctor running ${port}`);
})