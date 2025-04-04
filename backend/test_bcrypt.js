const bcrypt = require('bcrypt');

// Step 1: Define the password to test
const password = "mathayo77";

// Step 2: Copy and paste the FULL stored hash from your database
const storedHash = "$2b$10$n3yhdUWOHomjF3DHll01xO7E/PhoL7ZXogbHAHlVNTjHJysSBEyB."; // Replace with full hash

// Step 3: Compare the password with the stored hash
bcrypt.compare(password, storedHash, (err, result) => {
    if (err) {
        console.error("Error during password comparison:", err);
    } else {
        console.log("Password match:", result); // true if correct, false if incorrect
    }
});
