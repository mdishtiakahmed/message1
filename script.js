// ------------------ Global Variables ------------------
let userRole;       // "account1" অথবা "account2"
let username;       // ব্যবহারকারীর নাম
let peer;
let dataConn;
let localStream;
let currentCall;
let chatHistory = [];

// DOM Elements
const loginSection = document.getElementById('loginSection');
const chatSection  = document.getElementById('chatSection');
const videoSection = document.getElementById('videoSection');

const loginButton   = document.getElementById('loginButton');
const passwordInput = document.getElementById('passwordInput');
const accountSelect = document.getElementById('accountSelect');

const usernameInput     = document.getElementById('usernameInput');
const updateUsernameBtn = document.getElementById('updateUsername');

const chatMessagesDiv = document.getElementById('chatMessages');
const chatInput       = document.getElementById('chatInput');
const sendChatButton  = document.getElementById('sendChat');

const localVideo  = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startVideoButton = document.getElementById('startVideo');
const stopVideoButton  = document.getElementById('stopVideo');

const videoContainer = document.getElementById('videoContainer');
const videoFullScreenButton = document.getElementById('videoFullScreen');
const chatFullScreenButton = document.getElementById('chatFullScreen');

// ------------------ Local Storage Functions ------------------
function saveLoginInfo() {
  localStorage.setItem('userRole', userRole);
  localStorage.setItem('username', username);
}
function loadLoginInfo() {
  const storedRole = localStorage.getItem('userRole');
  const storedName = localStorage.getItem('username');
  if (storedRole && storedName) {
    userRole = storedRole;
    username = storedName;
    usernameInput.value = username;
    accountSelect.value = userRole;
    return true;
  }
  return false;
}
function saveChatHistory() {
  localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}
function loadChatHistory() {
  const storedChat = localStorage.getItem('chatHistory');
  if (storedChat) {
    chatHistory = JSON.parse(storedChat);
    chatHistory.forEach(msg => {
      appendChatMessage(msg.sender, msg.text, msg.time, false);
    });
  }
}

// ------------------ Full Screen Functions ------------------
function toggleFullScreen(element) {
  if (!document.fullscreenElement) {
    element.requestFullscreen().catch(err => {
      alert(`ফুল-স্ক্রিন মোড চালু করতে সমস্যা: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
}
videoFullScreenButton.addEventListener('click', () => {
  toggleFullScreen(videoContainer);
});
chatFullScreenButton.addEventListener('click', () => {
  toggleFullScreen(chatSection);
});

// ------------------ PeerJS Initialization ------------------
function initPeer() {
  peer = new Peer(userRole, { debug: 2 });
  
  peer.on('open', function(id) {
    console.log("Peer ID:", id);
    if(userRole === 'account1'){
      dataConn = peer.connect("account2");
      setupDataConnection(dataConn);
    }
  });
  peer.on('connection', function(conn) {
    dataConn = conn;
    setupDataConnection(conn);
  });
  peer.on('call', function(call) {
    if(localStream) {
      call.answer(localStream);
    } else {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(function(stream){
          localStream = stream;
          localVideo.srcObject = stream;
          call.answer(stream);
        })
        .catch(function(err){
          console.error("মিডিয়া ডিভাইস এক্সেসে সমস্যা:", err);
        });
    }
    currentCall = call;
    call.on('stream', function(remoteStream){
      remoteVideo.srcObject = remoteStream;
    });
  });
}

// ------------------ Login Functionality ------------------
loginButton.addEventListener('click', function(){
  const pwd = passwordInput.value.trim();
  if(pwd !== 'robintanu'){
    alert("ভুল পাসওয়ার্ড!");
    return;
  }
  userRole = accountSelect.value;
  username = userRole;  // ডিফল্ট নাম হিসেবে account নাম
  usernameInput.value = username;
  saveLoginInfo();
  
  loginSection.style.display = 'none';
  chatSection.style.display  = 'block';
  videoSection.style.display = 'block';

  initPeer();
  loadChatHistory();
});

// ------------------ Update Username ------------------
updateUsernameBtn.addEventListener('click', function(){
  const newName = usernameInput.value.trim();
  if(newName !== ""){
    username = newName;
    alert("নাম আপডেট হয়েছে: " + username);
    saveLoginInfo();
  }
});

// ------------------ Data Connection (Live Chat) Setup ------------------
function setupDataConnection(conn) {
  conn.on('open', function(){
    console.log("Data connection open");
    appendChatMessage("system", "আপনার সংযোগ স্থাপিত হয়েছে।", new Date().toLocaleTimeString(), true);
  });
  conn.on('data', function(data){
    try {
      const parsed = JSON.parse(data);
      appendChatMessage(parsed.sender, parsed.text, new Date().toLocaleTimeString(), true);
    } catch (e) {
      console.error("Invalid message format", e);
    }
  });
  conn.on('error', function(err){
    console.error(err);
  });
}

// ------------------ Chat Message Functions ------------------
sendChatButton.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', function(e){
  if(e.key === 'Enter'){
    sendChatMessage();
  }
});
function sendChatMessage() {
  const msg = chatInput.value.trim();
  if(msg === '' || !dataConn || !dataConn.open) return;
  const time = new Date().toLocaleTimeString();
  const messageData = { sender: username, text: msg, time: time };
  dataConn.send(JSON.stringify(messageData));
  appendChatMessage(username, msg, time, true);
  chatInput.value = '';
}
function appendChatMessage(sender, message, time, save=true) {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message');
  if(sender === username) {
    msgDiv.classList.add('self');
  } else if(sender === "system") {
    msgDiv.classList.add('system');
  } else {
    msgDiv.classList.add('peer');
  }
  msgDiv.innerHTML = `<strong>${sender}</strong> (${time}):<br>${message}`;
  chatMessagesDiv.appendChild(msgDiv);
  chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
  if(save) {
    chatHistory.push({ sender, text: message, time });
    saveChatHistory();
  }
}

// ------------------ Video/Audio Call Functions ------------------
startVideoButton.addEventListener('click', function(){
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(function(stream){
      localStream = stream;
      localVideo.srcObject = stream;
      if(userRole === 'account1'){
        currentCall = peer.call("account2", stream);
        currentCall.on('stream', function(remoteStream){
          remoteVideo.srcObject = remoteStream;
        });
      }
    })
    .catch(function(err){
      console.error("মিডিয়া ডিভাইস এক্সেসে সমস্যা:", err);
    });
});
stopVideoButton.addEventListener('click', function(){
  if(localStream){
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
    localVideo.srcObject = null;
    if(currentCall){
      currentCall.close();
    }
  }
});

// Auto-login if stored info exists
if(loadLoginInfo()){
  loginSection.style.display = 'none';
  chatSection.style.display  = 'block';
  videoSection.style.display = 'block';
  initPeer();
  loadChatHistory();
}