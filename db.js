const mongodb = require('mongodb')
const dotenv = require('dotenv')
dotenv.config()

mongodb.connect(process.env.CONNECTIONSTRING, { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
    module.exports = client

    const app = require('./app')

    const port = process.env.PORT
    app.listen(port, () => console.log(`App is up and running on ${port}...`))
})

