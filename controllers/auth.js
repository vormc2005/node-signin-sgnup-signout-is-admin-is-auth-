const User = require('../models/user')
const {errorHandler} = require("../helpers/dbErrorHandler")
const jwt = require('jsonwebtoken'); //to generate signed token
const expressJwt = require('express-jwt'); //for authorization check
const user = require('../models/user');


exports.signup = (req, res)=>{
// console.log('req.body')
    
  const user = new User(req.body)   //requires body parser, make sure to install it!!!!
  user.save((err, user)=>{
      if(err){
          return res.status(400).json({
              err: errorHandler(err)
          })
      }
      //to remove salt and hashed password from the object in mongo DB
      user.salt = undefined;
      user.hashed_password = undefined;
      res.json({
          user
      })
  })
};

exports.signin = (req, res)=>{
    //find a user based on email
    const{email, password} = req.body
    User.findOne({email}, (err, user)=>{
        if (err || !user){
            return res.status(400).json({
                error:'User with that email does not exist.Please signup' 
            });
        }
        //if user is found mae sure the email and password march
        //create authenticate method in user model
        if(!user.authenticate(password)){
            return res.status(401).json({
                error: "Email and password dont match"
            })
        }
        //generate a signed token with user id and secret
        const token = jwt.sign({_id: user._id}, process.env.JWT_SECRET)
        //persist toket as t in cookie with expiry date
        res.cookie("t", token, {expire:new Date()+9999})
        // return response with user and token to frontend client
        const{_id, name, email, role} = user
        return res.json({token, user:{_id, email, name, role}})
    })
};

exports.signout=(req, res)=>{
    res.clearCookie('t')
    res.json({message: "Signout successful"})
}

//protecting routes
exports.requireSignin = expressJwt({
    secret: process.env.JWT_SECRET,
    algorithms: ["HS256"], 
    userProperty: 'auth'
})

exports.isAuth = (req, res, next)=>{
    let user = req.profile && req.auth && req.profile._id == req.auth._id
    if(!user){
        return res.status(403).json({
            error:"Access denied"
        })
    }
    next()
}

exports.isAdmin = (req, res, next)=> {
    if(req.profile.role === 0){
        return res.status(403).json({
            error: 'Admin resource! Access denied'
        })
    }
    next()
}