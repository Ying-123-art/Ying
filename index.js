require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const gTTS = require('gtts');
const path = require('path');
const fs = require('fs');

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
    } catch (error) {
        console.error("Lỗi kết nối Voice:", error);
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

// 4. Sự kiện: Đọc chat qua lệnh "y "
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
});

// 5. Đăng nhập
client.once('ready', () => {
    console.log(`✅ Bot ${client.user.tag} đã online!`);
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