require('dotenv').config();
const express = require('express');
const session = require('express-session')
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const MongoStore = require('connect-mongo')(session);
const cookieParser = require('cookie-parser');
const LocalStrategy = require('passport-local').Strategy;

const findOrCreate = require('mongoose-findorcreate');


const app = express();
app.use(cookieParser());


app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

const uri = process.env.ATLAS_URI;

mongoose.connect(uri, {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false})
mongoose.set("useCreateIndex", true);

app.use(session({
  secret: process.env.SECRET,
  saveUninitialized: false,
  resave: false,
  cookie: { maxAge: 180 * 60 * 1000},
  store: new MongoStore({ mongooseConnection: mongoose.connection })
}));

app.use(passport.initialize());
app.use(passport.session());

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  name: String,
  dob: String,
  gender: String,
  address: String,
  phoneNo:String,
  role: String
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
  category: String,
  role: String
});

const adminSchema = new mongoose.Schema({
  username: String,
  password: String,
  phoneNo: String,
  role: String
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

const productSchema = new mongoose.Schema({
  name: String,
  image: String,
  description: String,
  cost: String
})

const cartSchema = new mongoose.Schema({
  userId: String,
  items: Array
})

const orderSchema = new mongoose.Schema({
  total: Number,
  date: Date,
  items: Array,
  userId: String
})




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

const Product = new mongoose.model("Product", productSchema);
const Cart = new mongoose.model("Cart", cartSchema);
const Order = new mongoose.model("Order", orderSchema);


passport.use('user-local', new LocalStrategy(User.authenticate()));
passport.use('doctor-local', new LocalStrategy(Doctor.authenticate()));
passport.use('admin-local', new LocalStrategy(Admin.authenticate()));




passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  if(user != null)
    done(null, user);
});


const roles = [];
roles["admin"] = Admin;
roles["doctor"] = Doctor;
roles["user"] = User

app.use(function(req, res, next){
  res.locals.login = req.isAuthenticated();
  next();
});

function isLogged(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }else{
    res.redirect("/login")
  }
}

function isAdmin(req, res, next){
  if (req.isAuthenticated() && req.user.role == "admin"){
    return next();
  }else{
    res.redirect("/admin/login");
  }
}



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

// Pharmacy Routes

app.get("/admin/addProduct", function(req, res){
  res.render("addProduct");
})

app.post("/admin/addProduct", function(req, res){
  const newProduct = new Product({
    name: req.body.name,
    image: req.body.image,
    description: req.body.description,
    cost: req.body.cost
  });
  newProduct.save((err) => {
    if (err){
      console.log(err);
    }
    else{
      console.log("Saved successfully");
      res.redirect("/products");
    }
  })
})

app.get("/products", function(req, res){
  Product.find({}, (err, products) => {
    if (err){
      console.log(err);
    }
    else{
      res.render("product", {products: products});
    }
  })
})

app.get("/cart", function(req, res){
  Cart.find({userId: req.user._id}, function(err, cart){
    if (err){
      console.log(err);
    }
    else{

      if (cart.length == 0){
        res.send("Your Cart is empty");
      }
      else{
        console.log(cart[0].items[0]);
        res.render("cart", {cart: cart});
      }
    }
  })
})

app.post("/addToCart", function(req, res){

  Cart.find({userId: req.user._id}, function(err, cart){
    var found = false;
    if (cart.length != 0){
      cart[0].items.forEach((item) => {
        console.log(item);
        if (item.id == req.body.itemId){
          found = true;
          item.qty = parseInt(item.qty) + parseInt(req.body.qty);
        }
      })
    }

    console.log("Value of found" + found);
    if (found){
      Cart.updateOne({userId: req.user._id}, {items: cart[0].items}, function(err){
        if (err){
          console.log(err);
        }
        else{
          console.log("Order quantity updated");
          res.redirect("/cart")
        }
      })
    }

    else{
      const newItem = {
        id: req.body.itemId,
        name: req.body.name,
        cost: req.body.cost,
        image: req.body.image,
        qty: req.body.qty
      }
      Cart.findOneAndUpdate({userId : req.user._id}, {
        $push: {items: newItem}

      },{upsert: true}, function(err){
        if (err){
          console.log(err);
        }
        else{
          console.log("Item Added to Cart");
          res.redirect("/cart")
        }
      })
    }
  })
})

app.get("/checkout", function(req, res){
  console.log(req.user);
  res.render("checkout", {user: req.user});
})

app.post("/checkout", function(req, res){

  Cart.find({userId: req.user._id}, function(err, cart){

    var total = 0;
    cart[0].items.forEach((item) => {
      total += item.cost * item.qty;
    })
    console.log(total);
    const newOrder = new Order({
      userId: req.user._id,
      items: cart[0].items,
      total: total,
      date: new Date()
    })

    newOrder.save((err) => {
      if (err){
        console.log(err);
      }
      else{
        console.log("Order placed");
        Cart.deleteOne({userId: req.user._id}, function(err){
          if (err){
            console.log(err);
          }
          else{
            console.log("Cart emptied");
          }
        })
        res.redirect("/orders")
      }
    })
  })
})

app.get("/orders", function(req, res){
  Order.find({userId: req.user._id}, function(err, orders){
    res.render("order", {orders: orders})
  })
})







// ....................

app.get("/profile", isLogged, function(req, res) {
  roles[req.user.role].find({_id: req.user._id}, (err, user) => {
    if (err){
      console.log(err);
    }
    else{
      res.render("profile", {user: user});
    }
  })
})


app.get("/profile/delete/:id", function(req, res){
  roles[req.user.role].deleteOne({_id: req.params.id}, function(err){
    if (err){
      console.log(err);
    }
    else{
      console.log("Deleted successfully");
      req.session.destroy(function(err){
        if (err){
          console.log(err);
        }
        else{
          console.log("session destroyed");
          res.redirect("/")
        }
      })
    }
  })
})

app.get("/profile/edit", function(req, res){
  roles[req.user.role].find({_id: req.user._id}, (err, user) => {
    if (err){
      console.log(err);
    }
    else{
      //console.log(user[0]);
      res.render("editProfile", {user: user[0]});
    }
  })
})

app.post("/profile/edit", function(req, res){
  roles[req.user.role].findByIdAndUpdate({_id: req.user._id},{
    name: req.body.name,
    address: req.body.address,
    dob: req.body.dob,
    phoneNo: req.body.phoneNo,
    gender: req.body.gender
  }, {new: true}, function(err){
    if (err){
      console.log(err);
    }
    else{
      console.log("Updated Successfully");
      res.redirect("/profile")
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

app.get("/appointments/tests", isLogged, function(req, res){
  TestAppoint.find({userId: req.user._id}, (err, testAppointments) => {
    if (err){
      console.log(err);
    }
    else{
      res.render("tappointments", {appoints: testAppointments});
    }
  })
})

app.get("/appointments/doctors", isLogged, function(req, res){
  DoctorAppoint.find({userId: req.user._id}, (err, doctorAppointments) => {
    if (err){
      console.log(err);
    }
    else{
    res.render("dappointments", {appoints: doctorAppointments});
  }
  })
})

app.get("/admin/addTest", isAdmin, function(req, res){

    res.render("addTest");
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

app.get("/admin/editTest", isAdmin, function(req, res){
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
    phoneNo: req.body.phoneNo,
    role: "user"
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
    category: req.body.category,
    role: "doctor"
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
    phoneNo: req.body.phoneNo,
    role: "admin"
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
        console.log(req);
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

app.get("/logout", function(req, res){
req.logout();
  req.session.destroy(function(err){
    if (err){
      console.log(err);
    }
    else{
      console.log("session destroyed");
      res.redirect("/")
    }
  })
})




app.listen(process.env.PORT || 3000, function(){
  console.log("Server started on port 3000");
});
