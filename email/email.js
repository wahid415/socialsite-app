const sgMail = require('@sendgrid/mail')

sgMail.setApiKey(process.env.SENDGRIDAPIKEY)

const sendWelcomeEmail = (email, name) => {
    sgMail.send({
        to: email,
        from: 'mdw5938@gmail.com',
        subject: 'Thanks for joining in!',
        text: `Welcome to the app, ${name}. Let me know how you get along with the app.`,
        html: `Welcome to the app, <strong>${name}</strong>. Let me know how you get along with the app.`, 
    })
}

module.exports = {
    sendWelcomeEmail
}
