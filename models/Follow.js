const usersCollection = require('../db').db().collection('users')
const followsCollection = require('../db').db().collection('follows')
const ObjectID = require('mongodb').ObjectID
const User = require('./User')

const Follow = function (followedUsername, authorId) {
    this.followedUsername = followedUsername
    this.authorId = authorId
    this.errors = []
}

Follow.prototype.cleanUp = function() {
    if(typeof(this.followedUsername) !== "string") this.followedUsername = ""
}

Follow.prototype.validate = async function(action) {
    // followedUsername must exist in the database  
    const followedAccount = await usersCollection.findOne({username: this.followedUsername})

    if(followedAccount) {
        this.followedId = followedAccount._id 
    } else {
        this.errors.push('Yous can not follow a user that does not exist!')
    }

    const doesFollowAlreadyExists = await followsCollection.findOne({followedId: this.followedId, authorId: new ObjectID(this.authorId)})
    if(action === 'create') {
        if(doesFollowAlreadyExists) {
            this.errors.push('You are already following this user!')
        }
    }
    if(action === 'delete') {
        if(!doesFollowAlreadyExists) {
            this.errors.push('You can not stop following the someone whom you are not following!')
        }
    }

    //You should not follow yourself
    if(this.followedId.equals(this.authorId)) {
        this.errors.push('You can not follow yourself!')
    }
}

Follow.prototype.create = function() {
    return new Promise(async (resolve, reject) => {
        this.cleanUp()
        await this.validate('create')

        if(!this.errors.length) {
            await followsCollection.insertOne({followedId: this.followedId ,authorId: new ObjectID(this.authorId)})
            resolve()
        } else {
            reject(this.errors)
        }
    })
}

Follow.prototype.delete = function() {
    return new Promise(async (resolve, reject) => {
        this.cleanUp()
        await this.validate('delete')

        if(!this.errors.length) {
            await followsCollection.deleteOne({followedId: this.followedId ,authorId: new ObjectID(this.authorId)})
            resolve()
        } else {
            reject(this.errors)
        }
    })
}

Follow.isVisitorFollowing = async function(followedId, visitorId) {
    const followDoc = await followsCollection.findOne({followedId: followedId, authorId: new ObjectID(visitorId)})
    if(followDoc) {
        return true
    }
    else {
        return false
    }
}

Follow.getFollowersById = function(id) {
    return new Promise(async (resolve, reject) => {
        try {
            let followers = await followsCollection.aggregate([
                {$match: {followedId: id}},
                {$lookup: {from: "users", localField: "authorId", foreignField: "_id", as: "userDoc"}},
                {$project: {
                    username: {$arrayElemAt: ["$userDoc.username", 0]},
                    email: {$arrayElemAt: ["$userDoc.email", 0]}
                }}
            ]).toArray()

            followers = followers.map((follower) => {
                const user = new User(follower, true)
                return { username: follower.username, avatar: user.avatar }
            })
            
            resolve(followers)
        } catch (e) {
            reject()
        } 
    })
}

Follow.getFollowingById = function(id) {
    return new Promise(async (resolve, reject) => {
        try {
            let followings = await followsCollection.aggregate([
                {$match: {authorId: id}},
                {$lookup: {from: "users", localField: "followedId", foreignField: "_id", as: "userDoc"}},
                {$project: {
                    username: {$arrayElemAt: ["$userDoc.username", 0]},
                    email: {$arrayElemAt: ["$userDoc.email", 0]}
                }}
            ]).toArray()

            followings = followings.map((followedUser) => {
                const user = new User(followedUser, true)
                return { username: followedUser.username, avatar: user.avatar }
            })
            
            resolve(followings)
        } catch (e) {
            reject()
        } 
    })
}

Follow.countFollowersById = function(id) {
    return new Promise(async (resolve, reject) => {
        try {
            const followerCount = await followsCollection.countDocuments({followedId: id})
            resolve(followerCount)
        } catch (e) {
            reject()
        }
    })
}

Follow.countFollowingsById = function(id) {
    return new Promise(async (resolve, reject) => {
        try {
            const followingCount = await followsCollection.countDocuments({authorId: id})
            resolve(followingCount)
        } catch (e) {
            reject()
        }
    })
}



module.exports = Follow