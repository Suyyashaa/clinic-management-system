require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session')
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const LocalStrategy = require('passport-local').Strategy;

const findOrCreate = require('mongoose-findorcreate');


const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: process.env.SECRET,
  saveUninitialized: false,
  resave: false,
  cookie: { secure: false}

}));

app.use(passport.initialize());
app.use(passport.session());

const uri = process.env.ATLAS_URI;

mongoose.connect(uri, {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false})
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  name: String,
  dob: String,
  gender: String,
  address: String,
  phoneNo:String
});

const testSchema = new mongoose.Schema({
  name: String,
  cost: String
});

const testAppointSchema = new mongoose.Schema({
  name: String,
  time: String,
  date: String,
  userId: String,
  report: String
});

const doctorAppointSchema = new mongoose.Schema({
  name: String,
  date: String,
  time: String,
  userId: String,
  report: String
});

const doctorSchema = new mongoose.Schema({
  username: String,
  password: String,
  name: String,
  dob: String,
  gender: String,
  address: String,
  phoneNo:String,
  fees: String,
  category: String
});

const adminSchema = new mongoose.Schema({
  username: String,
  password: String,
  phoneNo: String
});




userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

doctorSchema.plugin(passportLocalMongoose);
doctorSchema.plugin(findOrCreate);

adminSchema.plugin(passportLocalMongoose);
adminSchema.plugin(findOrCreate);


const User = new mongoose.model("User", userSchema);
const Test = new mongoose.model("Test", testSchema);
const TestAppoint = new mongoose.model("TestAppoint", testAppointSchema);
const DoctorAppoint = new mongoose.model("DoctorAppoint", doctorAppointSchema);
const Doctor = new mongoose.model("Doctor", doctorSchema);
const Admin = new mongoose.model("Admin", adminSchema);


passport.use('user-local', new LocalStrategy(User.authenticate()));
passport.use('doctor-local', new LocalStrategy(Doctor.authenticate()));
passport.use('admin-local', new LocalStrategy(Admin.authenticate()));


passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
passport.serializeUser(Doctor.serializeUser());
passport.deserializeUser(Doctor.deserializeUser());
passport.serializeUser(Admin.serializeUser());
passport.deserializeUser(Admin.deserializeUser());


app.get("/", function(req, res){
  res.render("home");
})
app.get("/login", function(req, res){
  res.render("login");
})
app.get("/register", function(req, res){
  res.render("register");
})
app.get("/doctor/login", function(req, res){
  res.render("dlogin");
})
app.get("/doctor/register", function(req, res){
  res.render("dregister");
})
app.get("/admin/login", function(req, res){
  res.render("alogin");
})
app.get("/admin/register", function(req, res){
  res.render("aregister");
})

app.get("/profile", function(req, res) {
  User.find({_id: req.user._id}, (err, user) => {
    if (err){
      console.log(err);
    }
    else{
      res.render("profile", {user: user});
    }
  })
})

app.get("/services", function(req, res){
  Test.find({}, (err, test) => {
    if (err){
      console.log(err);
    }
    else{
      res.render("services", {tests: test});
    }
  })
})

app.get("/appointments/tests", function(req, res){
  TestAppoint.find({userId: req.user._id}, (err, testAppointments) => {
    if (err){
      console.log(err);
    }
    else{
      res.render("tappointments", {appoints: testAppointments});
    }
  })
})

app.get("/appointments/doctors", function(req, res){
  DoctorAppoint.find({userId: req.user._id}, (err, doctorAppointments) => {
    if (err){
      console.log(err);
    }
    else{
    res.render("dappointments", {appoints: doctorAppointments});
  }
  })
})

app.get("/admin/addTest", function(req, res){
  console.log(req.user);
  if (req.isAuthenticated()){
    res.render("addTest");
  }
  else{
    res.redirect("/admin/login")
  }
})


app.post("/admin/addTest", function(req, res){
  const newTest = new Test({
    name: req.body.name,
    cost: req.body.cost
  });
  newTest.save((err) => {
    if (err){
      console.log(err);
    }
    else{
      console.log("Saved successfully");
      res.redirect("/services");
    }
  })
})

app.get("/admin/editTest", function(req, res){
  Test.find({}, (err, test) => {
    if (err){
      console.log(err);
    }
    else{
      res.render("editTest", {tests: test});
    }
  })
})

app.get("/admin/editTest/delete/:id", function(req, res){
  Test.deleteOne({_id: req.params.id}, function(err){
    if (err){
      console.log(err);
    }
    else{
      console.log("Deleted successfully");
      res.redirect("/admin/editTest")
    }
  })
})

app.get("/admin/editTest/edit/:id", function(req, res){
  Test.find({_id: req.params.id}, function(err, test){
    if (err){
      console.log(err);
    }
    else{
      res.render("editATest", {test: test});
    }
  })
})

app.post("/admin/editTest/edit/:id", function(req, res){
  Test.findByIdAndUpdate({_id: req.params.id},{
    name: req.body.name,
    cost: req.body.cost
  }, {new: true}, function(err){
    if (err){
      console.log(err);
    }
    else{
      console.log("Updated Successfully");
      res.redirect("/admin/editTest")
    }
  })
})


app.get("/schedule/test", function(req, res){
  Test.find({}, (err, test) => {
    if (err){
      console.log(err);
    }
    else{
      res.render("tschedule", {tests: test});
    }
  })
})

app.get("/schedule/doctor", function(req, res){
  Doctor.find({}, (err, doctor) => {
    if (err){
      console.log(err);
    }
    else{
      res.render("dschedule", {doctors: doctor});
    }
  })
})

app.post("/schedule/test", function(req, res){
  const scheduleTest = new TestAppoint({
    name: req.body.name,
    time: req.body.time,
    date: req.body.date,
    userId: req.user._id,
  });
  scheduleTest.save((err) => {
    if (err){
      console.log(err);
    }
    else{
      console.log("Saved successfully");
      res.redirect("/schedule");
    }
  })
})

app.post("/schedule/doctor", function(req, res){
  const scheduleDoctor = new DoctorAppoint({
    name: req.body.name,
    time: req.body.time,
    date: req.body.date,
    userId: req.user._id,

  });
  scheduleDoctor.save((err) => {
    if (err){
      console.log(err);
    }
    else{
      console.log("Saved successfully");
      res.redirect("/schedule");
    }
  })
})


app.post("/register", function(req, res){
  User.register({
    name: req.body.name,
    username: req.body.username,
    dob: req.body.dob,
    gender: req.body.gender,
    address: req.body.address,
    phoneNo: req.body.phoneNo
  },
  req.body.password, function(err, user){
    if (err){
      console.log(err);
      res.redirect("/register");
    } else{
      passport.authenticate("user-local")(req, res, function(){
        console.log("Successfully registered");
        res.redirect("/");
      })
    }
  })
})

app.post("/doctor/register", function(req, res){
  Doctor.register({
    name: req.body.name,
    username: req.body.username,
    dob: req.body.dob,
    gender: req.body.gender,
    address: req.body.address,
    phoneNo: req.body.phoneNo,
    fees: req.body.fees,
    category: req.body.category
  },
  req.body.password, function(err, user){
    if (err){
      console.log(err);
      res.redirect("/register");
    } else{
      passport.authenticate("doctor-local")(req, res, function(){
        res.send("Successfully registered");
        //res.redirect("/");
      })
    }
  })
})

app.post("/admin/register", function(req, res){
  Admin.register({
    username: req.body.username,
    phoneNo: req.body.phoneNo
  },
  req.body.password, function(err, user){
    if (err){
      console.log(err);
      res.redirect("/register");
    } else{
      passport.authenticate("admin-local")(req, res, function(){
        res.send("Successfully registered");
        //res.redirect("/");
      })
    }
  })
})

app.post("/login", function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err){
    if (err){
      console.log(err);
    }
    else{
      passport.authenticate("user-local")(req, res, function(){
        console.log("Successfully logged in!");
        console.log(req.user);
        res.redirect("/");
      })
    }
  })
});

app.post("/doctor/login", function(req, res){
  const user = new Doctor({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err){
    if (err){
      console.log(err);
    }
    else{
      passport.authenticate("doctor-local")(req, res, function(){
        console.log("Successfully logged in!");
        console.log(req.user);
        res.redirect("/");
      })
    }
  })
});

app.post("/admin/login", function(req, res){
  const user = new Admin({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err){
    if (err){
      console.log(err);
    }
    else{
      passport.authenticate("admin-local")(req, res, function(){
        console.log("Successfully logged in!");
        console.log(req.user);
        res.redirect("/");
      })
    }
  })
});




app.listen(process.env.PORT || 3000, function(){
  console.log("Server started on port 3000");
});
