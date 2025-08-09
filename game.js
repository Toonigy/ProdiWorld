// game.js
// This script assumes Firebase has been initialized in game.html and its instances are exposed globally.

// Import necessary Firebase Auth and Firestore functions for modular SDK
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const serverSelectionDiv = document.getElementById('server-selection');
    const mainAreaDiv = document.getElementById('main-area');
    const serverButtons = document.querySelectorAll('.server-button');
    const selectedServerNameSpan = document.getElementById('selected-server-name');
    const serverMessage = document.getElementById('server-message');
    const userInfoSpan = document.getElementById('user-info');
    const logoutButton = document.getElementById('logout-button');
    const displayUserIdSpan = document.getElementById('display-user-id');
    const displayUsernameSpan = document.getElementById('display-username');


    // Get Firebase auth and db instances from the global window object
    const auth = window.firebaseAuth;
    const db = window.firebaseDb;

    let currentUser = null; // To store the current authenticated user

    /**
     * Displays a message to the user in the server-message div.
     * @param {string} message The message to display.
     * @param {boolean} isError True if the message is an error, false for success/info.
     */
    function displayServerMessage(message, isError) {
        serverMessage.textContent = message;
        if (isError) {
            serverMessage.className = 'text-center text-sm mt-6 text-red-400';
        } else {
            serverMessage.className = 'text-center text-sm mt-6 text-green-400';
        }
    }

    /**
     * Fetches the user's username from Firestore.
     * @param {string} uid The user's UID.
     * @returns {Promise<string|null>} The username or null if not found/error.
     */
    async function getUsername(uid) {
        try {
            const userDocRef = doc(db, 'users', uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                return userDocSnap.data().username;
            } else {
                console.warn("No user data found for UID:", uid);
                return null;
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            return null;
        }
    }

    // Authentication State Listener
    // This runs whenever the user's sign-in state changes (login, logout, refresh)
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in
            currentUser = user;
            const username = await getUsername(user.uid);
            userInfoSpan.textContent = `Logged in as: ${username || user.email}`;
            displayUserIdSpan.textContent = user.uid; // Display user ID in main area
            displayUsernameSpan.textContent = username || 'N/A'; // Display username in main area
            console.log("User is authenticated:", user.uid);
            // Show server selection initially
            serverSelectionDiv.classList.remove('hidden');
            mainAreaDiv.classList.add('hidden');
        } else {
            // User is signed out, redirect to login page
            currentUser = null;
            console.log("No user authenticated. Redirecting to login.");
            window.location.href = 'index.html';
        }
    });

    // Handle Logout
    logoutButton.addEventListener('click', async () => {
        try {
            await signOut(auth);
            // onAuthStateChanged will handle the redirect
        } catch (error) {
            console.error("Error signing out:", error);
            displayServerMessage(`Logout failed: ${error.message}`, true);
        }
    });

    // Handle Server Selection
    serverButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            if (!currentUser) {
                displayServerMessage('Please log in first.', true);
                return;
            }

            const selectedServer = event.target.dataset.server;
            displayServerMessage(`Connecting to ${selectedServer} server...`, false);
            console.log(`User ${currentUser.uid} selected server: ${selectedServer}`);

            // Simulate connection delay or actual connection logic
            setTimeout(() => {
                // Hide server selection and show main area
                serverSelectionDiv.classList.add('hidden');
                mainAreaDiv.classList.remove('hidden');
                selectedServerNameSpan.textContent = selectedServer; // Update server name in main area
                displayServerMessage(`Successfully connected to ${selectedServer}!`, false);
                // Here you would typically load game assets, connect to the server websocket, etc.
                // For now, it's just a visual transition.
            }, 1500); // Simulate loading
        });
    });
});
