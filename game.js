// game.js
// This script assumes Firebase has been initialized in game.html and its instances are exposed globally.

// Import necessary Firebase Auth functions for modular SDK
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// Import Realtime Database functions
import { getDatabase, ref, get, set, onValue, child } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";


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

    // Canvas elements
    const gameCanvas = document.getElementById('game-canvas');
    const ctx = gameCanvas.getContext('2d');

    // Get Firebase auth and Realtime Database instances from the global window object
    const auth = window.firebaseAuth;
    const database = window.firebaseRealtimeDb; // Now using Realtime Database instance

    let currentUser = null; // To store the current authenticated user
    let currentUsername = 'Guest'; // Default username
    let currentPlayerColor = '#ffc107'; // Default player color (gold)

    // Object to store all players currently in the game (including self)
    const players = {};

    // Player object for the game canvas
    const player = {
        x: gameCanvas.width / 2, // Start in the center of the canvas
        y: gameCanvas.height / 2,
        radius: 15, // Size of the player avatar
        color: currentPlayerColor,
        speed: 4, // Pixels per frame
        targetX: gameCanvas.width / 2, // Initial target is current position
        targetY: gameCanvas.height / 2,
        isMoving: false // Track if the player is currently moving
    };

    // Reference to the players node in Realtime Database (e.g., /game_state/players)
    // This will hold the positions and data of all active players
    let playersRef = null; // Will be set after server selection

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
     * Fetches the user's username from Realtime Database.
     * @param {string} uid The user's UID.
     * @returns {Promise<string|null>} The username or null if not found/error.
     */
    async function getUsername(uid) {
        try {
            // Reference to the user's data in the Realtime Database: /users/{uid}/username
            const userDbRef = ref(database); // Get a reference to the root of your database
            const snapshot = await get(child(userDbRef, `users/${uid}/username`)); // Get the username field
            if (snapshot.exists()) {
                return snapshot.val(); // Return the value of the username
            } else {
                console.warn("No username data found for UID:", uid);
                return null;
            }
        } catch (error) {
            console.error("Error fetching username from Realtime Database:", error);
            return null;
        }
    }

    // Authentication State Listener
    // This runs whenever the user's sign-in state changes (login, logout, refresh)
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in
            currentUser = user;
            currentUsername = await getUsername(user.uid) || user.email; // Get username or use email
            userInfoSpan.textContent = `Logged in as: ${currentUsername}`;
            displayUserIdSpan.textContent = user.uid; // Display user ID in main area
            displayUsernameSpan.textContent = currentUsername; // Display username in main area
            console.log("User is authenticated:", user.uid);
            // Show server selection initially
            serverSelectionDiv.classList.remove('hidden');
            mainAreaDiv.classList.add('hidden');
        } else {
            // User is signed out, redirect to login page
            currentUser = null;
            currentUsername = 'Guest';
            console.log("No user authenticated. Redirecting to login.");
            window.location.href = 'index.html';
        }
    });

    // Handle Logout
    logoutButton.addEventListener('click', async () => {
        try {
            // Remove player data from Realtime DB on logout
            if (currentUser && playersRef) {
                await set(child(playersRef, currentUser.uid), null); // Remove player's data
            }
            await signOut(auth);
            // onAuthStateChanged will handle the redirect
        } catch (error) {
            console.error("Error signing out:", error);
            displayServerMessage(`Logout failed: ${error.message}`, true);
        }
    });

    // Handle Server Selection
    serverButtons.forEach(button => {
        button.addEventListener('click', async (event) => { // Added async here
            if (!currentUser) {
                displayServerMessage('Please log in first.', true);
                return;
            }

            const selectedServer = event.target.dataset.server;
            displayServerMessage(`Connecting to ${selectedServer} server...`, false);
            console.log(`User ${currentUser.uid} selected server: ${selectedServer}`);

            // Set the Realtime DB reference for the selected server's players
            // Example path: /servers/Orion/players/{uid}
            playersRef = ref(database, `servers/${selectedServer}/players`);

            // Simulate connection delay or actual connection logic
            setTimeout(async () => { // Added async here
                // Hide server selection and show main area
                serverSelectionDiv.classList.add('hidden');
                mainAreaDiv.classList.remove('hidden');
                selectedServerNameSpan.textContent = selectedServer; // Update server name in main area
                displayServerMessage(`Successfully connected to ${selectedServer}!`, false);

                // Initialize canvas size and draw for the first time
                resizeCanvas();

                // Set initial player position in Realtime DB when joining
                player.x = gameCanvas.width / 2;
                player.y = gameCanvas.height / 2;
                player.targetX = player.x;
                player.targetY = player.y;

                if (currentUser) {
                    await set(child(playersRef, currentUser.uid), {
                        x: player.x,
                        y: player.y,
                        username: currentUsername,
                        color: currentPlayerColor // Save player's color
                    });
                }


                // Listen for changes in other players' positions
                onValue(playersRef, (snapshot) => {
                    const allPlayersData = snapshot.val();
                    // Clear existing players, then repopulate
                    for (const playerId in players) {
                        delete players[playerId];
                    }

                    if (allPlayersData) {
                        for (const uid in allPlayersData) {
                            if (uid !== currentUser.uid) { // Don't track self as an "other player"
                                players[uid] = allPlayersData[uid];
                            }
                        }
                    }
                    // The game loop will redraw everything
                });


                // Start the game loop when entering the main area
                requestAnimationFrame(gameLoop);
            }, 1500); // Simulate loading
        });
    });

    // --- Game Canvas Logic ---

    /**
     * Resizes the canvas to fit its container and maintain aspect ratio if needed.
     * Also redraws the game content after resizing.
     */
    function resizeCanvas() {
        const parent = gameCanvas.parentElement;
        gameCanvas.width = parent.clientWidth * 0.9; // 90% of parent width
        gameCanvas.height = gameCanvas.width * (3 / 4); // Maintain 4:3 aspect ratio

        // Ensure player position stays within bounds or adjusts if canvas size drastically changes
        player.x = Math.min(Math.max(player.x, player.radius), gameCanvas.width - player.radius);
        player.y = Math.min(Math.max(player.y, player.radius), gameCanvas.height - player.radius);
        player.targetX = player.x; // Reset target on resize to prevent out-of-bounds movement
        player.targetY = player.y;

        drawGame(); // Redraw content after resizing
    }

    // Call resize on load and on window resize
    window.addEventListener('resize', resizeCanvas);
    // Initial call will be made after server selection

    /**
     * Draws a single player avatar on the canvas.
     * @param {object} p The player object to draw.
     * @param {string} name The username to display.
     * @param {string} color The color of the avatar.
     */
    function drawAvatar(p, name, color) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.closePath();

        // Draw username above player
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(name, p.x, p.y - p.radius - 8);
    }

    /**
     * Clears the canvas and redraws all game elements (local player and other players).
     */
    function drawGame() {
        ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height); // Clear the entire canvas

        // Draw other players
        for (const uid in players) {
            const otherPlayer = players[uid];
            drawAvatar({ x: otherPlayer.x, y: otherPlayer.y, radius: player.radius }, otherPlayer.username, otherPlayer.color);
        }

        // Draw local player (always on top)
        drawAvatar(player, currentUsername, player.color);
    }

    /**
     * Updates game state (e.g., local player movement) and synchronizes with Realtime DB.
     */
    function updateGame() {
        const dx = player.targetX - player.x;
        const dy = player.targetY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 1) { // Move if target is more than 1 pixel away
            player.x += (dx / distance) * player.speed;
            player.y += (dy / distance) * player.speed;
            player.isMoving = true;

            // Update player's position in Realtime DB if they are moving
            // Use set() for full updates, this will overwrite previous state for this user
            if (currentUser && playersRef) {
                // Throttle this in a real game to avoid too many writes!
                set(child(playersRef, currentUser.uid), {
                    x: player.x,
                    y: player.y,
                    username: currentUsername,
                    color: currentPlayerColor
                });
            }

        } else {
            player.x = player.targetX; // Snap to target if very close
            player.y = player.targetY;
            player.isMoving = false; // Stop moving flag
        }
    }

    /**
     * The main game loop.
     */
    function gameLoop() {
        updateGame(); // Update local player position and sync to DB
        drawGame();   // Redraw everything (local player and others)
        requestAnimationFrame(gameLoop); // Request next frame
    }

    /**
     * Handles clicks on the game canvas for player movement.
     * @param {MouseEvent} event The click event.
     */
    gameCanvas.addEventListener('click', (event) => {
        // Get the bounding rectangle of the canvas
        const rect = gameCanvas.getBoundingClientRect();
        // Calculate the click coordinates relative to the canvas
        // Account for current canvas size vs. its actual resolution
        const scaleX = gameCanvas.width / rect.width;
        const scaleY = gameCanvas.height / rect.height;

        player.targetX = (event.clientX - rect.left) * scaleX;
        player.targetY = (event.clientY - rect.top) * scaleY;

        console.log(`Clicked at: (${player.targetX}, ${player.targetY})`);
    });
});
