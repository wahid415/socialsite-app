const userController = require('./controllers/userController')
const postController = require('./controllers/postController')
const followController = require('./controllers/followController')
const cors = require('cors') // To allow cross origin request resource access
const apiRouter = require('express').Router()

// This will allow cross origin resource access like from 4200 sending request to app running on 3000
// and also like from browser side request to api-based application running on 3000/etc port
// which without explicitly giving permission cors facility gives "cors blocked error" 
apiRouter.use(cors()) // so it will allow cors request

apiRouter.post('/login', userController.apiLogin)
apiRouter.post('/create-post', userController.apiUserMustBeLoggedIn, postController.apiCreatePost)
apiRouter.delete('/post/:id', userController.apiUserMustBeLoggedIn, postController.apiDeletePost)
apiRouter.get('/postsByAuthor/:username', userController.apiGetPostsByUsername)

module.exports = apiRouter