const User = require('../models/User')
const Post = require('../models/Post')
const Follow = require('../models/Follow')
const jwt =  require('jsonwebtoken')
const { sendWelcomeEmail } = require('../email/email')

//API codes starts here
exports.apiGetPostsByUsername = async function(req, res) {
    try {
        const authDoc = await User.findByUsername(req.params.username)
        const userPosts = await Post.findByAuthorId(authDoc._id)
        res.status(200).json(userPosts)
    } catch (e) {
        res.status(400).json('Sorry! Invalid user requested')
    }
}

exports.apiUserMustBeLoggedIn = async function (req, res, next) {
    try {
        req.apiUser = await jwt.verify(req.body.token, process.env.JWTPRIVATEKEY)
        next()
    } catch (e) {
        res.status(403).json('You must provide a valid token!')
    }
}

exports.apiLogin = function (req, res) {
    let user = new User(req.body)
    console.log(user)
    user.login().then(async (result) => {
        const token = await jwt.sign({_id: user.data._id}, process.env.JWTPRIVATEKEY, {expiresIn: '7d'})
        res.status(200).json(token)
    }).catch((e) => {
        res.json('Sorry, your values are incorrect!')
    })
}


//API codes ends here

exports.doesUsernameExist = async function(req, res) {
    try {
        const usernameExist = await User.findByUsername(req.body.username)
        if(usernameExist) {
            res.json(true)
        }
    }
    catch (e) {
        res.json(false)
     }
}

exports.doesEmailExist = async function(req, res) {
    try {
        const emailBool = await User.doesEmailExist(req.body.email)
        res.json(emailBool)
    }
    catch (e) {
        console.log('Please try again later!')
     }
}



exports.sharedProfileData = async function (req, res, next) {
    let isFollowing = false
    let isVisitorProfile = false
    if(req.session.user) {
        isVisitorProfile = req.profileUser._id.equals(req.session.user._id)
        isFollowing = await Follow.isVisitorFollowing(req.profileUser._id, req.visitorId)
    }

    req.isFollowing = isFollowing
    req.isVisitorProfile = isVisitorProfile

    // retrieve posts, follower and following count
    const postCountPromise = Post.countPostsByAuthor(req.profileUser._id)
    const followerCountPromise = Follow.countFollowersById(req.profileUser._id)
    const followingCountPromise = Follow.countFollowingsById(req.profileUser._id)
    const [postCount, followerCount, followingCount] = await Promise.all([postCountPromise, followerCountPromise, followingCountPromise])
    
    req.postCount = postCount
    req.followerCount = followerCount
    req.followingCount = followingCount

    next()
}

exports.userMustBeLoggedIn = function (req, res, next) {
    if(req.session.user) {
        next()
    }
    else{
        req.flash('errors', 'You must be logged in to perform that action!')
        req.session.save(function() {
            res.redirect('/')
        })
    }
}

exports.login = function (req, res) {
    let user = new User(req.body)

    user.login().then((result) => {
        req.session.user = { avatar: user.avatar, username: user.data.username, _id: user.data._id }
        req.session.save(() => {
            res.redirect('/')
        })
        
    }).catch((e) => {
        //NOTE: flash npm package is used here to flashing error messages in browser by saving in session object easily 
        req.flash('errors', e) // It sets the errors array prop to session flash prop for showing errors in browser
        req.session.save(function () {
            res.redirect('/')
        })
    })
}

exports.logout = function (req, res) {
    req.session.destroy(() => {
        res.redirect('/')
    })
}
exports.register = async function (req, res) {
    let user = new User(req.body)

    user.register().then(() => {
        req.session.user = { username: user.data.username, avatar: user.avatar, _id: user.data._id }
    
        sendWelcomeEmail(req.body.email, req.session.user.username) // Sending to registering user
        
        req.session.save(() => {
            res.redirect('/')
        })
    }).catch((regErrors) => {
        regErrors.forEach((error) => {
            req.flash('regErrors', error)
        })
        req.session.save(() => {
            res.redirect('/')
        })
    })

}

exports.home = async function (req, res) {
    if(req.session.user) {
        const posts = await Post.getFeed(req.session.user._id)
        //Below 2nd arg is for providing additional data to ejs template file
        res.render('home-dashboard', { posts: posts })
    }
    else {
        //req.flash()-> here sets the error array prop of session to the template and simultaneously deletes session errors data frm db when phone is reloaded
        res.render('home-guest', { regErrors:  req.flash('regErrors') }) 
    }
}

exports.ifUserExists = function (req, res, next) {
    User.findByUsername(req.params.username).then((userDocument) => {
        req.profileUser = userDocument
        next()
    }).catch((e) => {
        res.render('404')
    })
}

exports.profilePostScreen = function (req, res) {
    // Ask post model for posts by a certain author id
    Post.findByAuthorId(req.profileUser._id).then((posts) => {
        res.render('profile', {
            title: `Profile for ${req.profileUser.username}`,
            currentPage: "posts",
            posts,
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorProfile: req.isVisitorProfile,
            counts: {postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount}
        })
    }).catch((e) => {
        res.render('404')
    })
}

exports.profileFollowersScreen = async function(req, res) {
    try {
        const followers = await  Follow.getFollowersById(req.profileUser._id)
        res.render('profile-followers', {
            currentPage: "followers",
            followers,
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorProfile: req.isVisitorProfile,
            counts: {postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount}
        })
    } catch (e) {
        res.render('404')
    }
}

exports.profileFollowingScreen = async function(req, res) {
    try {
        const followings = await  Follow.getFollowingById(req.profileUser._id)
        res.render('profile-followings', {
            currentPage: "followings",
            followings,
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorProfile: req.isVisitorProfile,
            counts: {postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount}
        })
    } catch (e) {
        res.render('404')
    }
}