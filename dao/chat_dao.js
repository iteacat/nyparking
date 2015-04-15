/**
 * Created by yin on 4/14/15.
 */

var chats = [];
var CHAT_LEN = 1000;

var addChat = function (chat) {
    console.log('from server: "%s" is added', chat);
    chats.unshift(chat);
    while (chats.length > CHAT_LEN) {
        chats.pop();
    }
}

exports.addChat = addChat;
exports.chats = chats;