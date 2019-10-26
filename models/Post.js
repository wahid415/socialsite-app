const postCollection = require('../db').db().collection('posts')
const followCollection = require('../db').db().collection('follows')
const ObjectID = require('mongodb').ObjectID
const User = require('./User')
const sanitizeHTML = require('sanitize-html')

const Post = function (data, userId, requestedPostId) {
    this.data = data,
    this.errors = [],
    this.userId = userId,
    this.requestedPostId = requestedPostId
}

Post.prototype.cleanUp = function () {
    if(typeof(this.data.title) !== 'string') this.data.title = ""
    if(typeof(this.data.body) !== 'string') this.data.body = ""

    //get rid of the bogus property
    this.data = {
        title: sanitizeHTML(this.data.title.trim(), { allowedTags: [], allowedAttributes: {} }),
        body: sanitizeHTML(this.data.body.trim(), { allowedTags: [], allowedAttributes: {} }),
        createdDate: new Date(),
        author: ObjectID(this.userId)
    }
}

Post.prototype.validate = function () {
    if (this.data.title === "") this.errors.push('you must provide a title for post!')
    if (this.data.body === "") this.errors.push('you must provide post content!')

}

Post.prototype.create = function () {
    return new Promise((resolve, reject) => {
        this.cleanUp()
        this.validate()

        if(!this.errors.length) {
            postCollection.insertOne(this.data).then((info) => {
                resolve(info.ops[0]._id) // resolved with newly created post id
            }).catch(() => {
                this.errors.push('Something went wrong.Please try again later')
                reject(this.errors)
            })
        }
        else {
            reject(this.errors)
        }
    })
}

Post.prototype.update = function() {
    return new Promise(async (resolve, reject) => {
        try {
            const post = await Post.findSinglePostById(this.requestedPostId, this.userId)
            
            // Actually update the db
            if (post.isVisitorOwner) {
                const status = await this.actuallyUpdate()
                resolve('success')
            } else {
                reject()
            }
        } catch (e) {
            reject()
        }
    })
}

Post.prototype.actuallyUpdate = function () {
    return new Promise(async (resolve, reject) => {
        this.cleanUp()
        this.validate()

        if (!this.errors.length) {
            await postCollection.findOneAndUpdate(
                {_id: new ObjectID(this.requestedPostId)},
                {$set: {title: this.data.title, body: this.data.body}})

            resolve('success')
        }
        else {
            resolve('failure')
        }
    })
}

//A reusable function for post creating
Post.reusablePostQuery = function (uniqueOperations, visitorId) {
    return new Promise(async (resolve, reject) => {
        let aggOperations = uniqueOperations.concat([
            {$lookup: { from: 'users', localField: 'author', foreignField: '_id', as: 'authorDocument'}},
            {$project: {
                title: 1,
                body: 1,
                createdDate: 1,
                authorId: "$author", // $author is author prop in db which id of user
                author: {$arrayElemAt: ['$authorDocument', 0]} // here author prop( which was id of user) is changed to user object
            }}
        ])

        let posts = await postCollection.aggregate(aggOperations).toArray()

        //clean up author property in each post object
        posts = posts.map(function (post) {
            post.isVisitorOwner = post.authorId.equals(visitorId)
            post.authorId = undefined // delete post.authorId -> is slow operation

            post.author = {
                username: post.author.username,
                avatar: new User(post.author, true).avatar
            }
            return post
        })

        resolve(posts)
    })
}

//Function adding to Post model not to user object in object oriented way
Post.findSinglePostById = function (id, visitorId) {
    return new Promise(async (resolve, reject) => {
        if(typeof(id) !== 'string' || !ObjectID.isValid(id)) {
            reject()
            return
        }
        
        let posts = await Post.reusablePostQuery([{
            $match: {_id: new ObjectID(id)}
        }], visitorId)

        if(posts.length) {
            resolve(posts[0])
        }
        else {
            reject()
        }
    })
}

Post.findByAuthorId = function(authorId) {
    return Post.reusablePostQuery([
        {$match: { author: authorId }},
        {$sort: { createdDate: -1 }}
    ])
}

Post.delete = function(postIdToDelete, currentUserId) {
    return new Promise ( async (resolve, reject) => {
        try {
            const post = await Post.findSinglePostById(postIdToDelete, currentUserId)

            if(post.isVisitorOwner) {
               await postCollection.deleteOne({_id: new ObjectID(postIdToDelete)})
               resolve()
            } else {
                reject()
            }
        } catch (error) {
            reject()
        }
    })
}

Post.search = function(searchTerm) {
    return new Promise(async (resolve, reject) => {
        if (typeof(searchTerm) === 'string') {
            const posts = await Post.reusablePostQuery([
                {$match: {$text: {$search: searchTerm}}},
                {$sort: {score: {$meta: "textScore"}}}
            ])
            resolve(posts)
        } else {
            reject()
        }
    })
}

Post.countPostsByAuthor = function(id) {
    return new Promise(async (resolve, reject) => {
        try {
            const postCount = await postCollection.countDocuments({author: id})
            resolve(postCount)
        } catch (e) {
            reject()
        }
    })
}

Post.getFeed = async function(id) {
    // create an array of user ids that the current user follows
    let followedUsers = await followCollection.find({authorId: new ObjectID(id)}).toArray()
    followedUsers = followedUsers.map(followDoc => {
        return followDoc.followedId
    })

    // Look for posts where the author is in the above array of followed users
    return Post.reusablePostQuery([
        {$match: {author: {$in: followedUsers}}},
        {$sort: {createdDate: -1}}
    ])
}

module.exports = Post