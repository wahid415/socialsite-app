const express = require('express')
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)
const flash = require('connect-flash')
const markdown = require('marked') // allows user to give style their content like bold, italic etc
const sanitizeHTML = require('sanitize-html') // TO clean up the html or evil script content 
const csrf = require('csurf') //To detect malicious cross site request forgery 
const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

//API based application setup
app.use('/api', require('./api-router'))

// End of API setup


const router = require('./router')

const sessionOptions = session({  //Setup of session
    secret: 'javascript is cool',
    store: new MongoStore({ client: require('./db') }),
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: true }
})

app.use(sessionOptions) //Telling express to use session configurations
app.use(flash())

// middleware will run before every route and user data inside locals object -> (res.locals.user)
// will be available in every ejs rendered file
app.use((req, res, next) => {
    //make mark down function available to all ejs templates
    res.locals.filterUserHTML = function(content) {
        return sanitizeHTML(markdown(content), {
            allowedTags: ['p','br','ul','li','strong','bold','i','em','h1','h2','h3','h4','h5','h6'],
            allowedAttributes: {}
        })
    }

    // make all errors and success flash messages available from all templates
    res.locals.errors = req.flash('errors')
    res.locals.success = req.flash('success')

    // make current user id available on req object
    if(req.session.user) {
        req.visitorId = req.session.user._id    
    } else {
        req.visitorId = 0
    }

    // make user session data available from within all view template
    res.locals.user = req.session.user
    next()
})

app.use(express.static('public'))

app.set('views', 'views')
app.set('view engine', 'ejs')

/**
 * Here if any malicious user tries to hack the site by cross site request request below code will detect it
 * Like any user with false html sends the same request for creating post it will require a csrfToken
 * set by server in actual html in hidden way for genuine user site. So any any other user with malicious
 * request will be mising that hidden csrfToke so will be caught and thrown error.  
 */
app.use(csrf())
app.use(function(req, res, next) {
    res.locals.csrfToken = req.csrfToken()
    next()
})

//error showing for csrf attack
app.use(function(err, req, res, next) {
    if(err) {
        if(err.code === "EBADCSRFTOKEN") {
            req.flash('errors', 'Cross site request forgery detected!')
            req.session.save(() => res.redirect('/'))
        } else {
            res.render('404')
        }
    }
})

app.use('/', router)

const server = require('http').createServer(app)
const io = require('socket.io')(server)

// This is just making our Express session data available from the context of the socketIO
// Basically yeah session data ko socket io ke chat/communication code me available Karta so that
// user details like avatar, username etc ka use ho sake in chat UI
io.use(function(socket, next) {
    sessionOptions(socket.request, socket.request.res, next)
})

io.on('connection', (socket) => {
    console.log('A new user connected!!!')

    io.emit('welcome', {
        username: socket.request.session.user.username,
        avatar: socket.request.session.user.avatar
    })

    if(socket.request.session.user) {
        const user = socket.request.session.user 

        socket.on('chatMessageFromBrowser', (data) => {
            socket.broadcast.emit('chatMessageFromServer', {
                message: sanitizeHTML(data.message, { allowedSchemesByTag: [], allowedAttributes: {} }),
                username: user.username,
                avatar: user.avatar
            })
        })
    }    
})


module.exports = server
