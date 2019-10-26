const express = require('express')
const router = express.Router()
const userController = require('./controllers/userController')
const postController = require('./controllers/postController')
const followController = require('./controllers/followController')

// user related routes
router.get('/', userController.home)
router.post('/register', userController.register)
router.post('/login', userController.login)
router.post('/logout', userController.logout)
router.post('/doesUsernameExist', userController.doesUsernameExist)
router.post('/doesEmailExist', userController.doesEmailExist)

//profile related routes
router.get('/profile/:username', userController.ifUserExists, userController.sharedProfileData, userController.profilePostScreen)
router.get('/profile/:username/followers', userController.ifUserExists, userController.sharedProfileData, userController.profileFollowersScreen)
router.get('/profile/:username/followings', userController.ifUserExists, userController.sharedProfileData, userController.profileFollowingScreen)

//post related routes
router.get('/create-post', userController.userMustBeLoggedIn, postController.viewCreateScreen)
router.post('/create-post', userController.userMustBeLoggedIn, postController.create)
router.get('/post/:id', postController.viewSingle)
router.get('/post/:id/edit', userController.userMustBeLoggedIn, postController.viewEditScreen)
router.post('/post/:id/edit', userController.userMustBeLoggedIn, postController.edit)
router.post('/post/:id/delete', userController.userMustBeLoggedIn, postController.delete)
router.post('/search', postController.search)

// Follow related routes
router.post('/addFollow/:username', userController.userMustBeLoggedIn, followController.addFollow)
router.post('/removeFollow/:username', userController.userMustBeLoggedIn, followController.removeFollow)

module.exports = router