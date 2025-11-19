import { generateToken } from "../lib/utils.js"
import User from "../models/user.model.js"
import bcrypt from "bcryptjs"
import cloudinary  from "../lib/cloudinary.js"

export const signup = async (req,res)=>{
    const {fullname,email,password} = req.body
    try {

        if(!fullname|| !email||!password){
            return res.status(400).json({message:"All fields are required"})
        }
        if(password.length<6){
            return res.status(400).json({message:"Password must have 6 characters"})
        }
        const user= await User.findOne({email})

        if (user) return res.status(400).json({message:"Email already exists"});

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password,salt)

        const newuser = new User({
            fullname:fullname,
            email:email,
            password:hashedPassword
        })
 
        if(newuser){
            generateToken(newuser._id, res)
            await newuser.save()

            res.status(201).json({
                _id:newuser._id,
                fullname:newuser.fullname,
                email:newuser.email,
                profilepic: newuser.profilepic,
            })
        }
        else{
            res.status(400).json({message: "Invalid user data"})
        }
    } catch (error) {
        console.log("Error in signup controller",error.message)
        res.status(500).json({message: "Internal server error"})
    }
}

export const login = async (req,res)=>{
    const {email,password} = req.body
    try {
        const user = await User.findOne({email})

        if(!user){
            return res.status(400).json({message:"Invalid Credentials"})
        }
        
        const ispasswordcorrect = await bcrypt.compare(password,user.password);
        if(!ispasswordcorrect){
            return res.status(400).json({message:"Invalid Credentials"})

        }
        generateToken(user._id,res)

        res.status(200).json({
            _id:user._id,
            fullname:user.fullname,
            email:user.email,
            profilepic: user.profilepic
        })
    } catch (error) {
        console.log("Error in login controller",error.message)
        res.status(500).json({message:"Internal Server Error"})
    }
}

export const logout = (req,res)=>{
    try {
        res.cookie("jwt","",{maxAge:0})
        res.status(200).json({message:"Logged out successfully"})
    } catch (error) {
        console.log("Error in the logout controller",error.message)
        res.status(500).json({message:"Internal Server Error"})
        
    }
}

export const updateProfile =  async (req,res)=>{
    try {
        const {profilepic} = req.body
        const userid = req.user._id

        if(!profilepic){
            return res.status(400).json({message:"profile pic is required"})
        }

       const uploadResponse =  await cloudinary.uploader.upload(profilepic)
       const updateUser = await User.findByIdAndUpdate(userid,{profilepic:uploadResponse.secure_url},{new:true})

       res.status(200).json(updateUser)
    } catch (error) {
        console.log("error in update profile",error)
        res.status(500).json({message:"Internal server error"})

    }
}

export const checkAuth = (req,res)=>{
    try {
        res.status(200).json(req.user)
    } catch (error) {
        console.log("Error in checkAuth controller",error.message)
        res.status(500).json({message:"Internal Server Error"})
    }
}