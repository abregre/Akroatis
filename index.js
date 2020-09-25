require('dotenv').config();
const Discord = require("discord.js");
const prefix = '?';
const token = process.env.TOKEN_KEY;
const ytdl = require("ytdl-core");

const bot = new Discord.Client();

const queue = new Map();

//Console logs for dev
bot.on("ready", () => {
  console.log("Bot running!");
});

bot.on("reconnecting", () => {
  console.log("Reconnecting!");
});

bot.on("disconnect", () => {
  console.log("Disconnect!");
});


bot.on("message", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;


  const serverQueue = queue.get(message.guild.id);
  //Reading text commands
  if (message.content.startsWith(`${prefix}play`)) {
    execute(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}skip`)) {
    skip(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}stop`)) {
    stop(message, serverQueue);
    return;
  } else {
    message.channel.send("You need to enter a valid command!");
    setTimeout(()=>{
      message.channel.bulkDelete(1)
    }, 3000)
  }
});

async function execute(message, serverQueue) {
  const args = message.content.split(" ");

  const voiceChannel = message.member.voice.channel;
  //Check if user is in voicechannel
  if (!voiceChannel){
    message.channel.send(
    "You need to be in a voice channel!"
    )
    clear();
    return;
}
     
  const permissions = voiceChannel.permissionsFor(message.client.user);
  //Checks for Bot permissions
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "I don't have permissions to join the channel!"
    );
    
  }

  //Get youtube song info
  const trackInfo = await ytdl.getInfo(args[1]);
  const track = {
    title: trackInfo.videoDetails.title,
    url: trackInfo.videoDetails.video_url
  };
  //Initialize Queue
  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      tracks: [],
      volume: 4,
      playing: true
    };

    queue.set(message.guild.id, queueContruct);

    queueContruct.tracks.push(track);

    try {
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
      play(message.guild, queueContruct.tracks[0]);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    //Pushes track into queue
    serverQueue.tracks.push(track);
    message.channel.send(`${track.title} has been added to the queue!`);
    clear()
    return;
  }

  //Clear bot messages after 3 seconds
  function clear(){
    setTimeout(()=>{
      message.channel.bulkDelete(1)
    }, 3000);
  }
}
//Creating the functions for each command
function skip(message, serverQueue) {
  if (!message.member.voice.channel){


    message.channel.send(
      "You have to be in a voice channel!"
    )
    setTimeout(()=>{
      message.channel.bulkDelete(1)
    }, 3000)
    return;
  }
  if (!serverQueue){

    message.channel.send("There are no tracks in the qeueu");
    setTimeout(()=>{
      message.channel.bulkDelete(1)
    }, 3000)
    return;
  }
  serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel){
    message.channel.send(
      "You have to be in a voice channel!"
    )
    setTimeout(()=>{
      message.channel.bulkDelete(1)
    }, 3000)
    return;
  }
  serverQueue.tracks = [];
  serverQueue.connection.dispatcher.end();
}

function play(guild, track) {
  const serverQueue = queue.get(guild.id);
  if (!track) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const dispatcher = serverQueue.connection
    .play(ytdl(track.url))
    .on("finish", () => {
      serverQueue.tracks.shift();
      play(guild, serverQueue.tracks[0]);
    })
    .on("error", error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`Start playing: **${track.title}**`);
  
}

bot.login(token);