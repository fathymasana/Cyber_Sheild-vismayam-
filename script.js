"use strict";

// ==========================================
// CYBERSHIELD - AES-256-GCM ENCRYPTION
// ==========================================

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const STORAGE_KEY = "cybershieldEncryptedMessage";

// Convert bytes to Base64
function toBase64(bytes) {
    let binary = "";

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary);
}

// Convert Base64 to bytes
function fromBase64(value) {
    const binary = atob(value.trim());
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
}

// ==========================================
// ENCRYPT MESSAGE
// ==========================================

async function encryptMessage(message) {

    const key = await crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    );

    const iv = crypto.getRandomValues(
        new Uint8Array(12)
    );

    const encrypted = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        encoder.encode(message)
    );

    const rawKey = await crypto.subtle.exportKey(
        "raw",
        key
    );

    const encryptedBytes = new Uint8Array(encrypted);

    const combined = new Uint8Array(
        iv.length + encryptedBytes.length
    );

    combined.set(iv, 0);
    combined.set(encryptedBytes, iv.length);

    return {
        encryptedMessage: toBase64(combined),
        secretKey: toBase64(new Uint8Array(rawKey))
    };
}

// ==========================================
// DECRYPT MESSAGE
// ==========================================

async function decryptMessage(encryptedMessage, secretKey) {

    const combined = fromBase64(encryptedMessage);
    const rawKey = fromBase64(secretKey);

    if (rawKey.length !== 32 || combined.length <= 12) {
        throw new Error("Invalid message or secret key.");
    }

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const key = await crypto.subtle.importKey(
        "raw",
        rawKey,
        {
            name: "AES-GCM"
        },
        false,
        ["decrypt"]
    );

    const decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        ciphertext
    );

    return decoder.decode(decrypted);
}

// ==========================================
// COPY TO CLIPBOARD
// ==========================================

async function copyText(elementId, button) {

    const field = document.getElementById(elementId);

    try {
        await navigator.clipboard.writeText(field.value);

        const oldText = button.textContent;
        button.textContent = "✓ COPIED";

        setTimeout(() => {
            button.textContent = oldText;
        }, 1500);

    } catch (error) {
        field.select();
        alert("Please copy the selected text manually.");
    }
}

// ==========================================
// PAGE 2 - ENCRYPTION TERMINAL
// ==========================================

const encryptBtn = document.getElementById("encryptBtn");

if (encryptBtn) {

    encryptBtn.addEventListener("click", async () => {

        const message = document.getElementById("plainText").value;
        const result = document.getElementById("encryptResult");
        const error = document.getElementById("encryptError");

        error.textContent = "";
        result.classList.add("hidden");

        if (!message.trim()) {
            error.textContent = "Please enter a message first.";
            return;
        }

        encryptBtn.disabled = true;
        encryptBtn.textContent = "ENCRYPTING...";

        try {

            const output = await encryptMessage(message);

            // Save encrypted message for Page 3
            localStorage.setItem(
                STORAGE_KEY,
                output.encryptedMessage
            );

            // Display encrypted message and secret key
            document.getElementById("encryptedText").value =
                output.encryptedMessage;

            document.getElementById("secretKey").value =
                output.secretKey;

            result.classList.remove("hidden");

        } catch (err) {

            error.textContent =
                "Encryption failed: " + err.message;

        } finally {

            encryptBtn.disabled = false;
            encryptBtn.textContent = "🔒 ENCRYPT MESSAGE";
        }
    });

    document.getElementById("copyEncrypted")
        .addEventListener("click", function () {
            copyText("encryptedText", this);
        });

    document.getElementById("copyKey")
        .addEventListener("click", function () {
            copyText("secretKey", this);
        });
}

// ==========================================
// PAGE 3 - DECRYPTION TERMINAL
// ONLY SECRET KEY INPUT
// ==========================================

const decryptBtn = document.getElementById("decryptBtn");

if (decryptBtn) {

    decryptBtn.addEventListener("click", async () => {

        const secretKey = document.getElementById("inputKey").value;

        const encryptedMessage = localStorage.getItem(STORAGE_KEY);

        const result = document.getElementById("decryptResult");
        const error = document.getElementById("decryptError");

        error.textContent = "";
        result.classList.add("hidden");

        if (!encryptedMessage) {
            error.textContent =
                "No encrypted message found. Please complete the Encryption page first.";
            return;
        }

        if (!secretKey.trim()) {
            error.textContent = "Please enter your secret key.";
            return;
        }

        decryptBtn.disabled = true;
        decryptBtn.textContent = "VERIFYING KEY...";

        try {

            const originalMessage = await decryptMessage(
                encryptedMessage,
                secretKey
            );

            document.getElementById("decryptedText").value =
                originalMessage;

            result.classList.remove("hidden");

        } catch (err) {

            error.textContent =
                "Verification failed. Check your secret key and try again.";

        } finally {

            decryptBtn.disabled = false;
            decryptBtn.textContent = "🔓 DECRYPT MESSAGE";
        }
    });

    document.getElementById("copyDecrypted")
        .addEventListener("click", function () {
            copyText("decryptedText", this);
        });
}
