// script.js
// This script assumes Firebase has been initialized in index.html and its instances are exposed globally.

// Import necessary Firebase Auth functions for modular SDK
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// Ensure the DOM is fully loaded before attaching event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Get references to HTML elements
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const signupButton = document.getElementById('signup-button');
    const loginButton = document.getElementById('login-button');
    const authMessage = document.getElementById('auth-message');

    // Get Firebase auth instance from the global window object (set in index.html)
    // This 'auth' variable is the Auth service instance.
    const auth = window.firebaseAuth;

    /**
     * Displays a message to the user in the auth-message div.
     * @param {string} message The message to display.
     * @param {boolean} isError True if the message is an error, false for success/info.
     */
    function displayMessage(message, isError) {
        authMessage.textContent = message;
        if (isError) {
            authMessage.className = 'text-center text-sm mt-4 text-red-400';
        } else {
            authMessage.className = 'text-center text-sm mt-4 text-green-400';
        }
    }

    /**
     * Handles user signup.
     */
    signupButton.addEventListener('click', async () => {
        const email = emailInput.value;
        const password = passwordInput.value;

        if (!email || !password) {
            displayMessage('Please enter both email and password.', true);
            return;
        }

        displayMessage('Signing up...', false); // Show loading message

        try {
            // Correct way to use createUserWithEmailAndPassword with modular SDK
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            displayMessage(`Signup successful! Welcome, ${user.email}. You can now log in.`, false);
            // Optionally clear fields or redirect
            emailInput.value = '';
            passwordInput.value = '';
            console.log('User signed up:', user);
            // In a real MMO, you might now redirect to the character creation or game world page
            // window.location.href = 'game.html';
        } catch (error) {
            console.error('Signup error:', error);
            // Display specific error messages to the user
            switch (error.code) {
                case 'auth/email-already-in-use':
                    displayMessage('That email is already in use. Try logging in or use a different email.', true);
                    break;
                case 'auth/invalid-email':
                    displayMessage('Please enter a valid email address.', true);
                    break;
                case 'auth/weak-password':
                    displayMessage('Password should be at least 6 characters.', true);
                    break;
                default:
                    displayMessage(`Signup failed: ${error.message}`, true);
                    break;
            }
        }
    });

    /**
     * Handles user login.
     */
    loginButton.addEventListener('click', async () => {
        const email = emailInput.value;
        const password = passwordInput.value;

        if (!email || !password) {
            displayMessage('Please enter both email and password.', true);
            return;
        }

        displayMessage('Logging in...', false); // Show loading message

        try {
            // Correct way to use signInWithEmailAndPassword with modular SDK
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            displayMessage(`Login successful! Welcome back, ${user.email}.`, false);
            console.log('User logged in:', user);
            // Redirect to the game world page
            // For a real app, this would be `window.location.href = 'game.html';`
            // For this example, we'll just show a success message.
            window.location.href = 'game.html'; // Assuming you'll create a game.html next
        } catch (error) {
            console.error('Login error:', error);
            // Display specific error messages to the user
            switch (error.code) {
                case 'auth/invalid-email':
                    displayMessage('Please enter a valid email address.', true);
                    break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    displayMessage('Invalid email or password. Please try again.', true);
                    break;
                case 'auth/user-disabled':
                    displayMessage('Your account has been disabled.', true);
                    break;
                default:
                    displayMessage(`Login failed: ${error.message}`, true);
                    break;
            }
        }
    });
});
