const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary')

const signup = async (req, res) => {
    try {
        const { username, fullName, email, password } = req.body;

        if (!username || !fullName || !email || !password) {
            return res.status(400).json({ message: `All fields are required!` })
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists!' });
        }

        const userNameTaken = await User.findOne({ username });
        if (userNameTaken) {
            return res.status(400).json({ message: 'Username already taken!' });
        }

        let avatar = null

        if (req?.files?.avatar) {
            const result = await cloudinary.v2.uploader.upload(req.files.avatar.tempFilePath, { folder: 'writeon--user-avatars' })
            avatar = result.secure_url
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({ username, fullName, email, password: hashedPassword });

        if(avatar){
            user.avatar = avatar
        }

        await user.save()

        const token = jwt.sign({ _id: user._id, email: user.email, username: user.username, fullName: user.fullName, avatar }, process.env.JWT_SECRET);

        res.status(201).json({ message: 'Account created successfully', token });

    } catch (error) {
        console.log(error);
        res.sendStatus(500)
    }

}


const login = async (req, res) => {
    try {
        const { emailOrUsername, password } = req.body;

        if (!emailOrUsername || !password) {
            return res.status(400).json({ message: `Email/username and password are required!` })
        }

        let user = null

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(emailOrUsername)) {
            user = await User.findOne({ email: emailOrUsername }).select('+password')
        } else {
            user = await User.findOne({ username: emailOrUsername }).select('+password')
        }

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials!' });
        }

        const comparePassword = await bcrypt.compare(password, user.password);

        if (!comparePassword) {
            return res.status(400).json({ message: 'Invalid credentials!' });
        }

        const token = jwt.sign({ _id: user._id, email: user.email, username: user.username, fullName: user.fullName, avatar: user.avatar}, process.env.JWT_SECRET);

        res.status(200).json({ message: 'Login successful', token });

    } catch (error) {
        console.log(error);
        res.sendStatus(500)
    }
}


module.exports = {
    login,
    signup
}