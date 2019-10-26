const Post = require('../models/Post')

//API services methods starts here
exports.apiCreatePost = function (req, res) {
    const post = new Post(req.body, req.apiUser._id)

    post.create().then((newId) => {
        res.status(201).json('congrats! post created.')
    }).catch((errors) => {
        res.status('400').json(errors)
    })
}

exports.apiDeletePost = function (req, res) {
    Post.delete(req.params.id, req.apiUser._id).then((value) => {
        res.status(200).json('successfully deleted post!')
    }).catch((errors) => {
        res.status(401).json('You do not have permission to perform that action!')
    })
}
// API code ends here

exports.viewCreateScreen = function (req, res) {
    res.render('create-post')
}

exports.create = function (req, res) {
    const post = new Post(req.body, req.session.user._id)

    post.create().then((newId) => {
        req.flash('success', 'New successfully created.')
        req.session.save(() => res.redirect(`/post/${newId}`))
        
    }).catch((errors) => {
        errors.forEach(error => req.flash('errors', error))
        req.session.save(() => res.redirect('/create-post'))
    })
}

exports.viewSingle = async function (req, res) {
    try {
        const post = await Post.findSinglePostById(req.params.id, req.visitorId)
        res.render('single-post-screen', {post: post, title: post.title})
    } catch (error) {
        res.render('404')
    }
}

exports.viewEditScreen = async function(req, res) {
    try {
        const post = await Post.findSinglePostById(req.params.id, req.visitorId)
        if (post.isVisitorOwner) {
            res.render("edit-post", {post: post})
        } else {
            req.flash("errors", "You do not have permission to perform that action.")
            req.session.save(() => res.redirect("/"))
        }
    } catch {
        res.render("404")
    }
  }

exports.edit = function (req, res) {
    const post = new Post(req.body, req.visitorId, req.params.id)
    
    //console.log(req.visitorId)
    post.update().then((status) => {
        // the post was successfully updated in the database
        // or user did have permission but there were validation errors
        if(status === 'success') {
            //post was updated in db
            req.flash('success', 'Post successfully updated.')
            req.session.save(function() {
                res.redirect(`/post/${req.params.id}/edit`)
            })
        } else {
            post.errors.forEach((error) => {
                req.flash('errors', error)
            })
            req.session.save(function () {
                res.redirect(`/post/${req.params.id}/edit`)
            })
        }
    }).catch((e) => {
        // post with the requested id doesn't exist
        // or if the current visitor is not the owner of  requested post
        req.flash('errors', 'You do not have the permission to perform that action!')
        req.session.save(function () {
            res.redirect('/')
        })
    })
}

exports.delete = function (req, res) {
    Post.delete(req.params.id, req.visitorId).then((value) => {
        req.flash('success', 'Post successfully deleted.')
        req.session.save(() => res.redirect(`/profile/${req.session.user.username}`))
    }).catch((errors) => {
        req.flash('errors', 'You don not have permission to perform that action!')
        req.session.save(() => res.redirect('/'))
    })
}


exports.search = function (req, res) {
    Post.search(req.body.searchTerm).then((posts) => {
        res.json(posts)
    }).catch((error) => {
        res.json([])
    })
}
