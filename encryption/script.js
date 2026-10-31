const $ = id => document.getElementById(id);

let savedEncryptedData = null;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Convert bytes to Base64
function toBase64(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

// Convert Base64 back to bytes
function fromBase64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function showStatus(message, error = false) {
  $("status").textContent = message;
  $("status").style.color = error ? "#ff7777" : "#26e6ce";
}

// ENCRYPTION
async function encryptMessage() {
  const message = $("message").value;

  if (!message.trim()) {
    showStatus("Please enter a sample message.", true);
    return;
  }

  try {
    // Generate a random 256-bit AES key
    const key = await crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256
      },
      true,
      ["encrypt", "decrypt"]
    );

    // Generate a fresh initialization vector
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt message
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      encoder.encode(message)
    );

    // Export secret key for demonstration
    const rawKey = await crypto.subtle.exportKey("raw", key);

    const keyText = toBase64(new Uint8Array(rawKey));
    const encryptedText = toBase64(
      new Uint8Array(encryptedBuffer)
    );

    // Save ciphertext and IV for receiver
    savedEncryptedData = {
      ciphertext: encryptedText,
      iv: iv
    };

    // Display results
    $("original").textContent = message;
    $("encrypted").textContent = encryptedText;
    $("secretKey").textContent = keyText;

    $("decrypted").textContent = "Waiting for decryption...";
    $("receiverKey").value = "";

    $("copyBtn").disabled = false;
    $("decryptBtn").disabled = false;

    showStatus("Message encrypted successfully!");

  } catch (error) {
    savedEncryptedData = null;
    $("original").textContent = "---";
    $("encrypted").textContent = "---";
    $("secretKey").textContent = "---";
    $("decrypted").textContent = "---";
    $("copyBtn").disabled = true;
    $("decryptBtn").disabled = true;
    showStatus("Encryption failed. Use HTTPS or localhost.", true);
  }
}

// DECRYPTION
async function decryptMessage() {
  if (!savedEncryptedData) {
    showStatus("Encrypt a message first.", true);
    return;
  }

  try {
    const enteredKey = $("receiverKey").value.trim();

    const rawKey = fromBase64(enteredKey);

    // AES-256 requires a 32-byte key
    if (rawKey.length !== 32) {
      throw new Error("Invalid key");
    }

    // Import receiver's key
    const key = await crypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );

    const encryptedBytes = fromBase64(
      savedEncryptedData.ciphertext
    );

    // Attempt decryption
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: savedEncryptedData.iv
      },
      key,
      encryptedBytes
    );

    const originalMessage = decoder.decode(decryptedBuffer);

    $("decrypted").textContent = originalMessage;

    showStatus("Correct key! Decryption successful.");

  } catch (error) {
    $("decrypted").textContent = "ACCESS DENIED";
    showStatus("Incorrect key or invalid encrypted data!", true);
  }
}

// COPY SECRET KEY
async function copySecretKey() {
  try {
    await navigator.clipboard.writeText(
      $("secretKey").textContent
    );

    showStatus("Secret key copied!");
  } catch (error) {
    showStatus("Please select and copy the displayed key.", true);
  }
}

// Button connections
$("encryptBtn").addEventListener("click", encryptMessage);
$("decryptBtn").addEventListener("click", decryptMessage);
$("copyBtn").addEventListener("click", copySecretKey);
