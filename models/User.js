const userCollection = require('../db').db().collection('users')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const md5 = require('md5')

const User = function (data, getAvatar) {  //User models for all business logics being set up as properties
    this.data = data,
    this.errors = []
    if (getAvatar) {this.getAvatar()}
    //if (getAvatar == undefined) {getAvatar = false}
}

User.prototype.cleanUp = function () { //Adding a single copy to all users being created by new (constructor) 
    if(typeof(this.data.username) !== "string") { this.data.username = "" }    
    if(typeof(this.data.email) !== "string") { this.data.email = "" }    
    if(typeof(this.data.password) !== "string") { this.data.password = "" }
    
    //get rid of any bogus property
    this.data = {
        username: this.data.username.trim().toLowerCase(),
        email: this.data.email.trim().toLowerCase(),
        password: this.data.password
    }
}

User.prototype.validate = function () {
    return new Promise(async (resolve, reject) => {
        if(this.data.username === "") this.errors.push('You must provide a username!')
        if(this.data.username !== "" && (!validator.isAlphanumeric(this.data.username)))
            this.errors.push('Username can only contain letters and numbers.')
        if(this.data.username.length > 0 && this.data.username.length < 3)
            this.errors.push('username must be at least 3 characters!')
        if(this.data.username.length > 30)
            this.errors.push('username should not exceed 30 characters!')
        
        if(!validator.isEmail(this.data.email)) this.errors.push('You must provide a valid email!')
    
        if(this.data.password === "") this.errors.push('You must provide a valid password!')
        if(this.data.password.length > 0 && this.data.password.length < 8)
            this.errors.push('password must be at least 8 characters!')
        if(this.data.password.length > 50) this.errors.push('password can not exceed 50 characters!')
    
        //Only if username is valid then check to see if it's already taken
        if(this.data.username.length > 2 && this.data.username.length < 31 && validator.isAlphanumeric(this.data.username)) {
            let usernameExists = await userCollection.findOne({username: this.data.username})
            if(usernameExists) this.errors.push('Username already exists!')
        }
    
        //Only if email is valid then check to see if it's already taken
        if(validator.isEmail(this.data.email)) {
            let usernameExists = await userCollection.findOne({username: this.data.username})
            if(usernameExists) this.errors.push('Email is already being taken!')
        }
        
        resolve()
    })
}


User.prototype.register = function () {
    return new Promise(async (resolve, reject) => {
        // step:1 -> Validate the users details of registration
        this.cleanUp()
        await this.validate()
    
        // step:2 -> Only if there are no validation error, the save user data into database    
        if(!this.errors.length) {
            //Hashing password before saving into database
            const salt = await bcrypt.genSalt(10)
            this.data.password = await bcrypt.hash(this.data.password, salt)
            
           await userCollection.insertOne(this.data)
           this.getAvatar()
           resolve()
        }
        else {
            reject(this.errors)
        }
    })
}

User.prototype.login = function () {
    
    return new Promise((resolve, reject) => {
        userCollection.findOne({ username: this.data.username }).then((attemptedUser) => {
            this.cleanUp()

            if(attemptedUser && bcrypt.compareSync(this.data.password, attemptedUser.password)) {
                this.data = attemptedUser
                this.getAvatar()
                resolve('congrats u logged in!')
            }
            else {
                reject('Invalid username / password !')
            }
        }).catch((e) => {
            reject('Something wrong went.Please try again later!')
        })
    })
}

User.prototype.getAvatar = function () {
    this.avatar = `https://gravatar.com/avatar/${md5(this.data.email)}?s=128`
}

User.findByUsername = function (username) {
    return new Promise((resolve, reject) => {
        if(typeof(username) !== 'string') {
            reject()
            return
        }

        userCollection.findOne({ username: username }).then((userDocument) => {
            if(userDocument) {
                userDocument = new User(userDocument, true)
                userDocument = {
                    _id: userDocument.data._id,
                    username: userDocument.data.username,
                    avatar: userDocument.avatar
                }
                
                resolve(userDocument)
            }
            else {
                reject()
            }
        }).catch((e) => {
            reject()
        })
    })
}

User.doesEmailExist = function(email) {
    return new Promise( async (resolve, reject) => {
        if(typeof(email) !== "string") {
            resolve(false)
            return
        }

        const user = await userCollection.findOne({email: email})
        if(user) {
            resolve(true)
        } else {
            resolve(false)
        }
    })
}

module.exports = User