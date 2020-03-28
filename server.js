var express = require('express');
var hbs = require('hbs');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var morgan = require('morgan');
var multer = require('multer');
var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');


mongoose.connect('mongodb://localhost:27017/Stickman',{ useNewUrlParser: true });
mongoose.Promise = global.Promise; // to remove the depreciating warning

const User = require('./models/profile.js');

// storing the userImage with the help of multer
const storage = multer.diskStorage({
  destination: function(req,file,cb){
    cb(null, './uploads/');
  },
  filename: function(req, file, cb){
    cb(null, new Date().toISOString() + file.originalname);
  }
});

const fileFilter = (req, file , cb)=>{
  if(file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg'){
    cb(null , true);
  }else{
    cb(null , false);
  }
};
var upload = multer({
  storage : storage,
  limits:{
    fileSize : 1024 * 1024 * 5 // 5 MB
  },
  fileFilter : fileFilter
});
///////////////////////////////////////////////////

var app = express();
app.use(express.static(__dirname+'/public'));
app.use(morgan('dev'));  // morgan
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use('/uploads',express.static('uploads'));

app.set('view engine', 'hbs');
var port = process.env.PORT || 5000;


app.get('/',(req,res)=>{
  res.render('signup.hbs');
});

app.post('/signup' , upload.single('userImage'),(req,res)=>{

  User.find({username : req.body.username, email: req.body.email})
  .exec()
  .then((user)=>{

    if(user.length>=1){
      res.status(404).render('error.hbs',{
        errorMessage : 'Auth failed User is already Present'
      });
    }

    bcrypt.hash(req.body.password , 10 , (err, hash)=>{
      if(err){
        return res.status(500).render('error.hbs',{
          errorMessage:err
        });
      }else{
        console.log(req.file);
        var user = new User({
          _id: new mongoose.Types.ObjectId(),
          username:req.body.username,
          email:req.body.email,
          password: hash,
          userImage: req.file.path
        });

        user.save().then((result)=>{
          console.log(result);
          res.render('success.hbs' , {
            successMessage : `Your username is ${user.username}`
          });
        }).catch((err)=>{
          //console.log(err);
          res.render('error.hbs',{
            errorMessage : err
          });
        });

      }
    });


  }).catch((error)=>{
    res.render('error.hbs',{
      errorMessage : error
    });
  });

});

app.get('/signin',(req,res)=>{
  res.render('signin.hbs');
});

app.post('/signin', (req,res)=>{
  User.find({email:req.body.email , username: req.body.username}).exec().then((user)=>{
    if(user.length<1){
      return res.status(401).render('error.hbs',{
        errorMessage : "Auth failed"
      });
    }
    bcrypt.compare(req.body.password , user[0].password , (err, result)=>{
      if(err){
        return res.status(401).render('error.hbs',{
          errorMessage : "Auth failed"
        });
      }
      if(result){
        return res.status(401).render('user.hbs',{
          successMessage : "Auth succesful",
          image: user[0].userImage,
          userUsername: user[0].username,
          userEmail : user[0].email
        });
      }
    });
  }).catch((err)=>{
    res.status(401).render('error.hbs',{
      errorMessage : "Auth failed"
    });
  });
});


app.use((error, req, res, next)=>{
  res.status(error.status || 500);
  // res.json({
  //   error:{
  //     message:error.message
  //   }
  // });
  res.render('error.hbs',{
    errorMessage : error.message
  })
});


app.listen(port,()=>{
  console.log(`server is up on port ${port}`);
});
