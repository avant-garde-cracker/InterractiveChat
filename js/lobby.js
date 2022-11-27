
import {APP_ID} from "./env.js"

let appId = APP_ID
let token = null
let uid = String(Math.floor(Math.random() * 1232))

let roomsData = {}
let initiate = async () => {
	let rtmClient = await AgoraRTM.createInstance(appId)
	await rtmClient.login({uid, token})

	let lobbyChannel = await rtmClient.createChannel('lobby')
	await lobbyChannel.join()

	rtmClient.on('MessageFromPeer', async(message, peerId) => {
		console.log("We got a message from peer !")
		let messageData = JSON.parse(message.text)
		let count = await rtmClient.getChannelMemberCount([messageData.room])
		roomsData[messageData.room] = {'members':count}

		let rooms = document.getElementById('room__container')
		let room = document.getElementById(`room__${messageData.room}`)
		if(room === null){
			room = await buildRoom(count, messageData.room)
			rooms.insertAdjacentHTML('beforeend', room)
		}

	})

	let buildRoom = async (count, room_id) => {
		let attributes = await rtmClient.getChannelAttributesByKeys(room_id, ['room_name', 'host', 'host_image'])
		let roomName = attributes.room_name.value
		let hostImage = attributes.host_image.value
		let hostName = attributes.host.value
		let roomItem = `<div class="room__item" id="room__${room_id}">
							<img src="./images/stream-1.png" alt="Room Image" class="display_image" />
							<div class="room__content">
								<p class="room__meta">
									<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="#ede0e0" viewBox="0 0 14 14">
  <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4Zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10Z"/></svg>
									<span>${count} Watching</span> 
								</p>
								<h3 class="room__title">${roomName}</h3>
								<div class="room__box">
									<div class="room__author">
										<img class="avatar__md" src="${hostImage}">
										<strong class="message__author">${hostName}</strong>
									</div>
									<a class="room__action" href="join.html?room=${room_id}">Join Now</a>
								</div>
							</div>
						</div>`
		return roomItem
	}

	let checkHeartBeat = async () => {
		for(let room_id in roomsData){
			let count = await rtmClient.getChannelMemberCount([room_id])
			if(count[room_id] < 1){
				document.getElementById(`room__${room_id}`).remove()
				delete roomsData[room_id]
			}else{
				let newRoom;// = document.getElementById(`room__${room_id}`)
				let rooms = document.getElementById('room__container')
				newRoom = await buildRoom(count[room_id], room_id)
				document.getElementById(`room__${room_id}`).innerHTML = newRoom
				// rooms.insertAdjacentHTML(newRoom)
			}
		}
	}

	let interval = setInterval(() => {
		checkHeartBeat()
	}, 2000)
	return () => clearInterval(interval)

}

initiate()