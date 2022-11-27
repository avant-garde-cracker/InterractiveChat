import {APP_ID} from "./env.js"

let appId = APP_ID
let token = null
let uid = sessionStorage.getItem('rtmUID')
if(uid === null || uid === undefined){
	uid = String(Math.floor(Math.random() * 232))	
	sessionStorage.setItem('rtmUID', uid)
}

let urlParmas  = new URLSearchParams(window.location.search)
let displayName = sessionStorage.getItem('display_name')
let room = urlParmas.get('room')
if (room === null || displayName === null){
	window.location = `join.html?room=${room}`
}
let host;
let hostId;
let roomName = sessionStorage.getItem('room_name')
let myAvatar = sessionStorage.getItem('avatar')

let initiate = async () => {
	let rtmClient = await AgoraRTM.createInstance(appId)
	await rtmClient.login({uid, token})

	try{
		let attributes = await rtmClient.getChannelAttributesByKeys(room, ['room_name', 'host_id'])
		roomName = attributes.room_name.value
		hostId = attributes.host_id.value
		if(uid === hostId){
			host = true
			document.getElementById('stream__controls').style.display = 'block'
		}
	}catch(error){
		await rtmClient.setChannelAttributes(room, {'room_name':roomName, 'host':displayName, 'host_image':myAvatar, 'host_id':uid})
		host = true
		// document.getElementById('stream__controls').style.display = 'flex'
	}

	const channel = await rtmClient.createChannel(room)
	await channel.join()

	await rtmClient.addOrUpdateLocalUserAttributes({'name':displayName})

	let lobbyChannel = await rtmClient.createChannel('lobby')
	await lobbyChannel.join()

	lobbyChannel.on('MemberJoined', async (memberId) => {
		let participants = await channel.getMembers()
		if(participants[0] === uid){
			let lobbyMembers = await lobbyChannel.getMembers()
			for(let i=0; lobbyMembers.length > i; i++){
				rtmClient.sendMessageToPeer({text:JSON.stringify({'room':room, 'type':'room_added'})}, lobbyMembers[i])
			}
		}
	})

	channel.on('MemberLeft', async (memberId) => {
		removeParticipantFromDom(memberId)

		let participants = await channel.getMembers()
		updateParticipantTotal(participants)
	})

	channel.on('MemberJoined', async (memberId) => {
		addParticipantToDom(memberId)

		let participants = await channel.getMembers()
		updateParticipantTotal(participants)
	})

	channel.on('ChannelMessage', async (messageData, memberId) => {
		let data = JSON.parse(messageData.text)
		let name = data.display_name
		let avatar = data.avatar
		// console.log('data is:', data)
		addMessageToDom(data.message, memberId, name, avatar)
		let participants = await channel.getMembers()
		updateParticipantTotal(participants)
	})

	let addParticipantToDom  = async (memberId) => {
		let {name} = await rtmClient.getUserAttributesByKeys(memberId, ['name'])
		let membersWrapper = document.getElementById('member__list')
		let memberItem = `<div class="member__wrapper" id="member__${memberId}__wrapper">
							<span class="green__icon"></span>
							<p class="member_name">${name}</p>
						  </div>`

		membersWrapper.innerHTML += memberItem
	}

	let addMessageToDom = (messageData, memberId, displayName, avatar) => {
		let created = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
		if(created.startsWith("0")){
			created = created.substring(1)
		}
		let messagesWrapper = document.getElementById('messages')
		let messageItem = `<div class="message__wrapper">
								<img class="avatar__md" src="${avatar}"/>
								<div class="message__body">
									<strong class="message__author">${displayName}</strong>
									<small class="message__timestamp">${created}</small>
									<p class="message__text">${messageData}</p>
								</div>
							</div>`
		messagesWrapper.insertAdjacentHTML('beforeend', messageItem)

		let lastMessage = document.querySelector('#messages .message__wrapper:last-child')
		lastMessage.scrollIntoView()

	}

	let sendMessage = async (e) => {
		e.preventDefault()
		let message = e.target.message.value
		channel.sendMessage({text:JSON.stringify({'message':message, 'display_name':displayName, 'avatar':myAvatar})})
		addMessageToDom(message, uid, displayName, myAvatar)
		e.target.reset()
	}

	let updateParticipantTotal = (participants) => {
		let total = document.getElementById('members__count')
		total.innerText = participants.length
	}

	let getParticipants = async () => {
		let participants = await channel.getMembers()
		if(participants.length <= 1){
			let lobbyMembers = await lobbyChannel.getMembers()
			for(let i=0; lobbyMembers.length > i; i++){
				rtmClient.sendMessageToPeer({text:JSON.stringify({'room':room, 'type':'room_added'})}, lobbyMembers[i])
			}
		}
		updateParticipantTotal(participants)
		for (let i=0; participants.length > i; i++){
			addParticipantToDom(participants[i])
		}
	}

	let removeParticipantFromDom = (memberId) => {
		document.getElementById(`member__${memberId}__wrapper`).remove()
	}

	let leaveChannel = async () => {
		await channel.leave()
		await rtmClient.logout()
	}
	window.addEventListener("beforeunload", leaveChannel)

	getParticipants()


	let messageForm = document.getElementById('message__form')
	messageForm.addEventListener('submit', sendMessage)
}

initiate()
