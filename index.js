require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const gTTS = require('gtts');
const path = require('path');
const fs = require('fs');
const play = require('play-dl');
const ffmpegPath = require('ffmpeg-static');
process.env.FFMPEG_PATH = ffmpegPath;

// 1. Cấu hình Bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// 2. Hàm dùng chung để Bot phát âm thanh
function botSpeak(channel, text) {
    try {
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        const gtts = new gTTS(text, 'vi');
        const filePath = path.join(__dirname, 'temp_voice.mp3');

        gtts.save(filePath, (err) => {
            if (err) return console.error("Lỗi lưu file voice:", err);

            const player = createAudioPlayer();
            const resource = createAudioResource(filePath);

            player.play(resource);
            connection.subscribe(player);

            player.on(AudioPlayerStatus.Idle, () => {
                // Thêm dòng connection.destroy() nếu muốn bot nói xong rồi rời room
            });
        });
        const resource = createAudioResource(filePath, {
            inputType: StreamType.Arbitrary, // Thêm dòng này nếu cần
        });
    } catch (error) {
        console.error("Lỗi kết nối Voice:", error);
    }
}

// Hàm phát nhạc từ YouTube
async function playYouTube(channel, url, message) {
    try {
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        const stream = await play.stream(url);
        const resource = createAudioResource(stream.stream, {
            inputType: stream.type
        });
        const player = createAudioPlayer();

        player.play(resource);
        connection.subscribe(player);

        player.on(AudioPlayerStatus.Playing, () => {
            message.channel.send('▶️ Đang phát nhạc!');
        });

        player.on('error', error => {
            console.error('Lỗi Audio Player:', error.message);
        });
    } catch (error) {
        console.error("Lỗi phát nhạc YouTube:", error);
        message.reply("❌ Lỗi phát nhạc. Hãy chắc chắn đó là một link YouTube hợp lệ!");
    }
}

// 3. Sự kiện: Chào khi có người vào Room
client.on('voiceStateUpdate', (oldState, newState) => {
    // Nếu người dùng mới vào room (trước đó không ở room nào)
    if (!oldState.channelId && newState.channelId && !newState.member.user.bot) {
        const userName = newState.member.displayName; 
        const message = `${userName} đã vào room`;
        
        console.log(`📢 Thông báo: ${message}`);
        botSpeak(newState.channel, message);
    }
});

// 4. Sự kiện: Xử lý tin nhắn (đọc chat, phát nhạc)
client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith('y ')) {
        const textToSay = message.content.replace('y ', '');
        const voiceChannel = message.member.voice.channel;

        if (voiceChannel) {
            botSpeak(voiceChannel, textToSay);
        } else {
            message.reply("Vào room voice đi rồi tôi mới nói được!");
        }
    }

    // Lệnh phát nhạc: p <link youtube>
    if (message.content.startsWith('p ')) {
        const url = message.content.replace('p ', '').trim();
        const voiceChannel = message.member.voice.channel;

        if (voiceChannel) {
            playYouTube(voiceChannel, url, message);
        } else {
            message.reply("Vào room voice đi rồi tôi mới bật nhạc được!");
        }
    }
});

// 5. Đăng nhập
client.once('clientReady', (c) => {
    console.log(`✅ Bot ${c.user.tag} đã online và sẵn sàng!`);
});

// THAY TOKEN MỚI SAU KHI RESET VÀO ĐÂY
const token = process.env.DISCORD_TOKEN;

if (!token) {
    console.error("❌ LỖI: Biến DISCORD_TOKEN chưa được thiết lập trên Railway!");
} else {
    client.login(token).catch(err => {
        console.error("❌ LỖI LOGIN:", err.message);
    });
}