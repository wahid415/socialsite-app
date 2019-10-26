import axios from 'axios'

export default class RegistrationForm {
    // 1.constructor
    constructor() {
        this._csrf = document.querySelector('[name="_csrf"]').value
        this.form = document.querySelector('#registration-form')
        this.allFields = document.querySelectorAll('#registration-form .form-control')
        this.insertValidationElements()
        this.username = document.querySelector('#username-register')
        this.username.previousValue = ""
        this.email = document.querySelector('#email-register')
        this.email.previousValue = ""
        this.password = document.querySelector('#password-register')
        this.password.previousValue = ""

        this.username.isUnique = false
        this.email.isUnique = false
        this.events()
    }

    // 2. Events
    events() {
        this.form.addEventListener('submit', e => {
            e.preventDefault()
            this.formSubmitHandler()
        })

        // username handling event
        this.username.addEventListener('keyup', () => {
            this.isDifferent(this.username, this.usernameHandler)
        })

        // email handling event
        this.email.addEventListener('keyup', () => {
            this.isDifferent(this.email, this.emailHandler)
        })

        // password handling event
        this.password.addEventListener('keyup', () => {
            this.isDifferent(this.password, this.passwordHandler)
        })

        /* Here changing the key event to blur event as well */
        // username handling event
        this.username.addEventListener('blur', () => {
            this.isDifferent(this.username, this.usernameHandler)
        })

        // email handling event
        this.email.addEventListener('blur', () => {
            this.isDifferent(this.email, this.emailHandler)
        })

        // password handling event
        this.password.addEventListener('blur', () => {
            this.isDifferent(this.password, this.passwordHandler)
        })
    }

    // 3. Methods
    formSubmitHandler() {
        this.usernameImmediately()
        this.usernameAfterDelay()
        this.emailAfterDelay()
        this.passwordImmediately()
        this.passwordAfterDelay()

        if(
            this.username.isUnique &&
            !this.username.errors &&
            this.email.isUnique &&
            !this.email.errors &&
            !this.password.errors
        ) {
            this.form.submit()
        }
    }

    isDifferent(el, handler) {
        if(el.previousValue != el.value) {
            handler.call(this)
        }
        el.previousValue = el.value
    }

    usernameHandler() {
        this.username.errors = false // To keep track of ongoing errors for displaying error message or not

        // some codes will run immediately
        this.usernameImmediately()

        // Some code after some time say after waiting for few milliseconds 
        clearTimeout(this.username.timer)
        this.username.timer = setTimeout(() => this.usernameAfterDelay() , 800)
    }

    usernameImmediately() {
        if(this.username.value !== "" && !/^([a-zA-Z0-9]+)$/.test(this.username.value)) {
            this.showValidationError(this.username, "Username can only contain Alpha-characters numbers!")
        }

        //Show error if username length is more than 30 character
        if(this.username.value.length > 30) {
            this.showValidationError(this.username, "Username should not be more than 30 character!")
        } 

        //When user deletes illegal character the this code executes
        if(!this.username.errors) {
            this.hideValidationError(this.username)
        }
    }

    usernameAfterDelay() {
        if(this.username.value.length < 3) {
            this.showValidationError(this.username, "Username should contain at least 3 character!")
        }

        // checking of username existence in db only when there is no error in frontend username
        if(!this.username.errors) {
            axios.post('/doesUsernameExist', {_csrf: this._csrf, username: this.username.value})
                .then((response) => {
                    if(response.data) {
                        this.showValidationError(this.username, "Username is already taken!")
                        this.username.isUnique = false
                    } else {
                        this.username.isUnique = true
                    }
                }).catch(() => {
                    console.log('Please try again after sometime!')
                })
        }
    }
    
    emailHandler() {
        this.email.errors = false // To keep track of ongoing errors for displaying error message or not
        
        // Some code after some time say after waiting for few milliseconds 
        clearTimeout(this.username.timer)
        this.email.timer = setTimeout(() => this.emailAfterDelay() , 800)
    }

    emailAfterDelay() {
        if(!/^\S+@\S+$/.test(this.email.value)) {
            this.showValidationError(this.email, "You must provide a valid email address!")

        }

        // checking of email existence in db only when there is no error in frontend email
        if(!this.email.errors) {
            axios.post('/doesEmailExist', {_csrf: this._csrf, email: this.email.value})
                .then((response) => {
                    if(response.data) {
                        this.showValidationError(this.email, "Email is already being used!")
                        this.email.isUnique = false
                    } else {
                        this.email.isUnique = true
                        this.hideValidationError(this.email)
                    }
                }).catch(() => {
                    console.log('Please try again after sometime!')
                })
        }
    }

    passwordHandler() {
        this.password.errors = false // To keep track of ongoing errors for displaying error message or not

        // some codes will run immediately
        this.passwordImmediately()

        // Some code after some time say after waiting for few milliseconds 
        clearTimeout(this.password.timer)
        this.password.timer = setTimeout(() => this.passwordAfterDelay() , 800)
    }

    passwordImmediately() {
        if(this.password.value.length > 50) {
            this.showValidationError(this.password, "Password cannot exceed 50 character!")
        }

        if(!this.password.errors) {
            this.hideValidationError(this.password)
        }
    }

    passwordAfterDelay() {
        if(this.password.value.length < 8) {
            this.showValidationError(this.password, "Password should be at least 8 characters!")
        }
    }


    hideValidationError(el) {
        el.nextElementSibling.classList.remove('liveValidateMessage--visible')
    }

    showValidationError(el, message) {
        el.nextElementSibling.innerHTML = message
        el.nextElementSibling.classList.add('liveValidateMessage--visible')
        el.errors = true
    }

    insertValidationElements() {
        this.allFields.forEach(function(el) {
            el.insertAdjacentHTML('afterend', `<div class="alert alert-danger small liveValidateMessage"></div>`)
        })
    }
 }  