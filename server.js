'use strict';

const WebSocket = require('ws');

const usedPort = process.env.PORT || 9000;
const socketServer = new WebSocket.Server({ port: usedPort });
socketServer.on('connection', onConnection);

class Client {
    constructor(socket, nickName, avatar) {
        this.socket = socket;
        this.nickName = nickName;
        this.avatar = avatar;
    }
};

let clientsArr = [];

class Message {
	constructor(nickName, avatar, type, data) {
		this.nickName  = nickName;
		this.avatar = avatar;
		this.type = type;
		this.data = data;
		this.time = Date.now();
	}
};

const maxMessagesOnServer = 100;
let messagesArr = [];

function sendingMessages(message) {
	const messageJSON = JSON.stringify(message);
	clientsArr.forEach(client => client.socket.send(messageJSON));

	if (messagesArr.length === maxMessagesOnServer) messagesArr.shift();
	messagesArr.push(message);
}

function onConnection(clientSocket) {
	console.log('-get new connection-');

	clientSocket.on('message', function (data) {
		let message = JSON.parse(data);
		console.log('message:', message);
		switch (message.type) {
			case 'usedAvatars'  : getUsedAvatarsRequest(clientSocket); break;
			case 'registration' : getRegistrationRequest(clientSocket, message); break;
			default : sendingMessages(message);
		}
	});

	clientSocket.on('close', function () {
		let client = clientsArr.find(client => client.socket === clientSocket);

    	let message = new Message(client.nickName, client.avatar, 'disconnection', null);
    	sendingMessages(message);

		clientsArr = clientsArr.filter(client => client.socket !== clientSocket);
    	console.log('-client disconnected-');
  });
}

console.log(`SERVER START on port ${usedPort}`);

function getUsedAvatarsRequest(clientSocket) {
	let avatarsArr = clientsArr.map(client => client.avatar);
	let message = new Message(null, null, 'usedAvatars', avatarsArr);
	clientSocket.send( JSON.stringify( message ) );
}

function getRegistrationRequest(clientSocket, data) {
	let isAvatarFree = true;
	let isNickNameFree = true;
	clientsArr.forEach( client => {
		if (client.avatar === data.avatar) isAvatarFree = false;
		if (client.nickName === data.nickName) isNickNameFree = false;
	});
	
	if (!isAvatarFree) {
		let message = new Message(null, null, 'avatarIsUsed', false);
		clientSocket.send( JSON.stringify( message ) );

		getUsedAvatarsRequest(clientSocket);
		return;
	}

	if (!isNickNameFree) {
		let message = new Message(null, null, 'nickNameIsUsed', false);
		clientSocket.send( JSON.stringify( message ) );
		return;
	}

	let connectionMessage = new Message(data.nickName, data.avatar, 'registrationSuccess', messagesArr);
	clientSocket.send( JSON.stringify(connectionMessage) );

	let client = new Client(clientSocket, data.nickName, data.avatar);
	clientsArr.push(client);

	let message = new Message(data.nickName, data.avatar, 'newRegistration', null);
	sendingMessages(message);
}