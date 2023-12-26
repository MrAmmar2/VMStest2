const { MongoClient, ServerApiVersion, MongoCursorInUseError } = require('mongodb');
const uri = "mongodb+srv://ammarpauzan:Mar25052002@cluster0.nyml2l7.mongodb.net/?retryWrites=true&w=majority";
const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();
const port = 3000;
const bcrypt = require('bcrypt');
const saltRounds = 10;
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'VMS API',
            version: '1.0.0'
        },
        components: {  // Add 'components' section
            securitySchemes: {  // Define 'securitySchemes'
                bearerAuth: {  // Define 'bearerAuth'
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        }
    },
    apis: ['./index.js'],
};

const swaggerSpec = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Connect the client to the server (optional starting in v4.7)
async function run() {
    try {
      // Connect the client to the server  (optional starting in v4.7)
      await client.connect();
      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    app.use(express.json());
    app.listen(port, () => {
      console.log(`Server listening at http://localhost:${port}`);
    });
    app.get('/', (req, res) => {
      res.send('Hello World!')
   });
    app.post('/regAdmin', async (req, res) => {
      let data = req.body;
      res.send(await regAdmin(client, data));
    });

    app.post('/login1', async (req, res) => {
      let data = req.body;
      res.send(await login(client, data));
    });

    app.post('/register', authenticateToken, async (req, res) => {
        
      let DataVis = req.body;
      res.send(await register(client, data, DataVis));
    });

    app.get('/read', authenticateToken, async (req, res) => {
      let data = req.user;
      res.send(await read(client, data));
    });

    app.patch('/update', authenticateToken, async (req, res) => {
      let data = req.user;
      let DataVis=req.body;
      res.send(await updateVisitorInformation(client, data,DataVis));
    });

    app.delete('/deleteVisitor', authenticateToken, async (req, res) => {
      let data = req.user;
      res.send(await deleteVisitor(client, data));
    });

    app.post('/checkIn', authenticateToken, async (req, res) => {
      let data = req.user;
      let DataVis = req.body;
      res.send(await checkIn(client, data, DataVis));
    });

    app.patch('/checkOut', authenticateToken, async (req, res) => {
      let data = req.user;
      res.send(await checkOut(client, data));
    });
} catch (e) {
    console.error(e);

  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.error);
//encrypt Password
  async function encryptPassword(password) {
    const hash = await bcrypt.hash(password, saltRounds);
     return hash;
    }
    async function decryptPassword(password, compare) {
      const match = await bcrypt.compare(password, compare)
      return match
    
    }
    //register function
    async function register(client, data, DataVis) {

      temporary = await client.db('labdata').collection('data').findOne({username: DataVis.username})
    if(!temporary) {
    
      if (data.role === 'Admin') {
        const result = await client.db('labdata').collection('data').insertOne({
          username: DataVis.username,
          password: await encryptPassword(DataVis.password),
          name: DataVis.name,
          email: DataVis.email,
          role: 'Security',
          visitors: []
        });
        return 'Security registered successfully';
      }else
    
      if (data.role === 'Security') {
        const result = await client.db('labdata').collection('data').insertOne({
          username: DataVis.username,
          password: await encryptPassword(DataVis.password),
          name: DataVis.name,
          ic: DataVis.ic,
          email: DataVis.email,
          phone: DataVis.phone,
          vehicleNo: DataVis.vehicleNo,
          department: DataVis.department,
          company: DataVis.company,
          role: 'Visitor',
          security: data.username,
          records: []
        });
    
        const result1 = await client.db('labdata').collection('data').updateOne(
          { username: data.username },
          { $push: { visitors: DataVis.username } }
        );
        return 'Visitor registered successfully';
      }} else {
        return 'Username already in use, please enter another username'
      }   
    
      return 'You are not allowed to register';
    }
  function generateToken(user){
    return jwt.sign(
    user,    //this is an obj
    'mypassword',           //password
    { expiresIn: '1h' });  //expires after 1 hour
  }
  function authenticateToken(req, res, next) {
    let header = req.headers.authorization;
  
    if (!header) {
      return res.status(401).send('Unauthorized');
    }
  
    let token = header.split(' ')[1];
  
    jwt.verify(token, 'mypassword', function(err, decoded) {
      if (err) {
        console.error(err);
        return res.status(401).send('Invalid token');
      }
  
      req.user = decoded;
      next();
    });
  }
  //read from token and checking role to display 
  async function read(client, data) {
    if(data.role == 'Admin') {
      Admins = await client.db('labdata').collection('data').find({role:"Admin"}).next() //.next to read in object instead of array
      Security = await client.db('labdata').collection('data').find({role:"Security"}).toArray()
      Visitors = await client.db('labdata').collection('data').find({role:"Visitor"}).toArray()
      Records = await client.db('labdata').collection('Records').find().next()
      return {Admins, Security, Visitors, Records}
      }
  
    if (data.role == 'Security') {
      Security = await client.db('labdata').collection('data').findOne({username: data.username})
      Visitors = await client.db('labdata').collection('data').find({security: data.username}).toArray()   
      Records = await client.db('labdata').collection('Records').find({username: {$in:Security.visitors}}).toArray()
      return {Security, Visitors, Records}
      }
  
    if (data.role == 'Visitor') {
      Visitor = await client.db('labdata').collection('data').findOne({username: data.username})
      Records = await client.db('labdata').collection('Records').find({recordID: {$in:Visitor.records}}).toArray()
      return {Visitor, Records}
    }
  }
  //register admin 
  async function regAdmin(client, data) {
  const existingAdmin = await client
    .db("labdata")
    .collection("data")
    .findOne({ username: data.username, role: "Admin" });

  if (existingAdmin) {
    return "Admin already registered";
  }else {
    data.password = await encryptPassword(data.password);
  const result = await client.db("labdata").collection("data").insertOne(data);
  return 'Admin registered';
  }
    }
 //login 
  async function login(client, data) {
    const user = await client
      .db("labdata")
      .collection("data")
      .findOne({ username: data.username });
  
    if (user) {
      const isPasswordMatch = await decryptPassword(data.password, user.password);
  
      if (isPasswordMatch) {
        console.log("Token for " + user.name + ": " + generateToken(user));
        return Display(user.role);
      } else {
        return "Wrong password";
      }
    } else {
      return "User not found";
    }
  }
  //output 
  function Display(data) {
    if(data == 'Admin') {
      return "You are logged in as Admin\n You can Access:\n 1.Register Security\n 2. Read All Users and Records"
    } else if (data == 'Security') {
      return "You are logged in as Security\n You can Access:\n 1.Register Visitor\n 2. Check My Data, My Visitors and Their Records' Data\n 3. Update Visitor Data\n 4. Delete My Data\n"
    } else if (data == 'Visitor') {
      return "You are logged in as Visitor\n You can Access:\n 1. Check My Data and My Records\n 3. Update My Data\n 4. Check In\n 5. Check Out\n 6. Delete My Data"
    }
  }
  
 //update visitor Info only visitor
  async function updateVisitorInformation(client, data, DataVis) {
    let result = null;  // Initialize result variable
  
    if (data.role == 'Visitor') {
      result = await client
        .db('labdata')
        .collection('data')
        .findOneAndUpdate(
          { username: DataVis.username },
          {
            $set: {
              phone: DataVis.phone,
              vehicleNo: DataVis.vehicleNo,
              department: DataVis.department,
              company: DataVis.company,
            }
          }
        );
    }else{
      return 'Only visitor can update the information'
    }
    
    if (result && result.ok && result.value) {
      return 'Visitor information updated successfully';
    } else {
      return 'Failed to update visitor information';
    }
  }
    // Check-in 
    async function checkIn(client, data, DataVis) {
      const usersCollection = client.db('labdata').collection('data');
      const recordsCollection = client.db('labdata').collection('Records');
    
      const currentUser = await usersCollection.findOne({ username: data.username });
    
      if (!currentUser) {
        return 'User not found';
      }
    
      if (currentUser.currentCheckIn) {
        return 'Already checked in, please check out first!!!';
      }
    
      if (data.role !== 'Visitor') {
        return 'Only visitors can access check-in.';
      }
    
      const existingRecord = await recordsCollection.findOne({ recordID: DataVis.recordID });
    
      if (existingRecord) {
        return `The recordID '${DataVis.recordID}' is already in use. Please enter another recordID.`;
      }
    
      const currentCheckInTime = new Date();
    
      const recordData = {
        username: data.username,
        recordID: DataVis.recordID,
        purpose: DataVis.purpose,
        checkInTime: currentCheckInTime
      };
    
      await recordsCollection.insertOne(recordData);
    
      await usersCollection.updateOne(
        { username: data.username },
        {
          $set: { currentCheckIn: DataVis.recordID },
          $push: { records: DataVis.recordID }
        }
      );
    
      return `You have checked in at '${currentCheckInTime}' with recordID '${DataVis.recordID}'`;
    }
  // Check-out operation
  //Function to check out
async function checkOut(client, data) {
  const usersCollection = client.db('labdata').collection('data');
  const recordsCollection = client.db('labdata').collection('Records');

  const currentUser = await usersCollection.findOne({ username: data.username });

  if (!currentUser) {
    return 'User not found';
  }

  if (!currentUser.currentCheckIn) {
    return 'You have not checked in yet, please check in first!!!';
  }

  const checkOutTime = new Date();

  const updateResult = await recordsCollection.updateOne(
    { recordID: currentUser.currentCheckIn },
    { $set: { checkOutTime: checkOutTime } }
  );

  if (updateResult.modifiedCount === 0) {
    return 'Failed to update check-out time. Please try again.';
  }

  const unsetResult = await usersCollection.updateOne(
    { username: currentUser.username },
    { $unset: { currentCheckIn: 1 } }
  );

  if (unsetResult.modifiedCount === 0) {
    return 'Failed to check out. Please try again.';
  }

  return `You have checked out at '${checkOutTime}' with recordID '${currentUser.currentCheckIn}'`;
}
//delete visitor function
async function deleteVisitor(client, data) {
  const usersCollection = client.db("labdata").collection("data");
  const recordsCollection = client.db("labdata").collection("Records");

  // Delete user document
  const deleteResult = await usersCollection.deleteOne({ username: data.username });
  if (deleteResult.deletedCount === 0) {
    return "User not found";
  }

  // Delete related records
  await recordsCollection.deleteMany({ username: data.username });

  // Update visitors array in other users' documents
  await usersCollection.updateMany(
    { visitors: data.username },
    { $pull: { visitors: data.username } }
  );
  return "Delete Successful";
}
